package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"config-studio/internal/audit"
	"config-studio/internal/plugin"
)

func (s *Server) handleExportProfile(w http.ResponseWriter, r *http.Request) {
	appSettings := s.config.Get()
	sources := s.plugins.Sources().ListSources()
	installed, _ := s.plugins.ListPlugins()

	profileApp := plugin.ProfileAppSettings{
		AppTitle:              appSettings.AppTitle,
		BaseColor:             appSettings.BaseColor,
		AccentColor:           appSettings.AccentColor,
		ThemeMode:             appSettings.ThemeMode,
		Language:              appSettings.Language,
		BottomDockMode:        appSettings.BottomDockMode,
		StructureGuardEnabled: appSettings.StructureGuardEnabled,
		CriticalPatterns:      appSettings.CriticalPatterns,
	}

	prof := plugin.GenerateProfile(profileApp, sources, installed)

	data, err := json.MarshalIndent(prof, "", "  ")
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "failed to generate profile: "+err.Error())
		return
	}

	filename := fmt.Sprintf("config-studio-profile-%s.json", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)

	if s.audit != nil {
		_ = s.audit.Log(audit.Event{
			User:     s.getAuditUser(r),
			IP:       r.RemoteAddr,
			Action:   "profile.export",
			Severity: audit.SeverityInfo,
			Target:   filename,
		})
	}
}

func (s *Server) handlePreviewProfile(w http.ResponseWriter, r *http.Request) {
	data, err := io.ReadAll(r.Body)
	if err != nil || len(data) == 0 {
		jsonError(w, http.StatusBadRequest, "empty profile payload")
		return
	}

	prof, err := plugin.ParseProfileBytes(data)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	appSettings := s.config.Get()
	sources := s.plugins.Sources().ListSources()
	installed, _ := s.plugins.ListPlugins()

	currentApp := plugin.ProfileAppSettings{
		AppTitle:              appSettings.AppTitle,
		BaseColor:             appSettings.BaseColor,
		AccentColor:           appSettings.AccentColor,
		ThemeMode:             appSettings.ThemeMode,
		Language:              appSettings.Language,
		BottomDockMode:        appSettings.BottomDockMode,
		StructureGuardEnabled: appSettings.StructureGuardEnabled,
		CriticalPatterns:      appSettings.CriticalPatterns,
	}

	preview, err := plugin.PreviewProfile(*prof, currentApp, sources, installed)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, preview)
}

func (s *Server) handleImportProfile(w http.ResponseWriter, r *http.Request) {
	var req plugin.ProfileImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	result := plugin.ProfileImportResult{
		PluginsQueued: []string{},
		Errors:        []string{},
	}

	if req.Profile.Sources == nil {
		req.Profile.Sources = []plugin.Source{}
	}
	if req.Profile.Plugins == nil {
		req.Profile.Plugins = []plugin.ProfilePlugin{}
	}

	// 1. Apply Settings if requested
	if req.ApplySettings {
		curr := s.config.Get()
		if req.Profile.App.AppTitle != "" {
			curr.AppTitle = req.Profile.App.AppTitle
		}
		if req.Profile.App.BaseColor != "" {
			curr.BaseColor = req.Profile.App.BaseColor
		}
		if req.Profile.App.AccentColor != "" {
			curr.AccentColor = req.Profile.App.AccentColor
		}
		if req.Profile.App.ThemeMode != "" {
			curr.ThemeMode = req.Profile.App.ThemeMode
		}
		if req.Profile.App.Language != "" {
			curr.Language = req.Profile.App.Language
		}
		if req.Profile.App.BottomDockMode != "" {
			curr.BottomDockMode = req.Profile.App.BottomDockMode
		}
		curr.StructureGuardEnabled = req.Profile.App.StructureGuardEnabled
		if len(req.Profile.App.CriticalPatterns) > 0 {
			curr.CriticalPatterns = req.Profile.App.CriticalPatterns
		}

		if err := s.config.Update(curr); err != nil {
			result.Errors = append(result.Errors, "failed to update settings: "+err.Error())
		} else {
			result.SettingsApplied = true
		}
	}

	// 2. Import Sources if requested
	if req.ImportSources {
		existing := s.plugins.Sources().ListSources()
		existingMap := make(map[string]bool)
		for _, ex := range existing {
			existingMap[strings.ToLower(strings.TrimSpace(ex.URL))] = true
		}

		for _, src := range req.Profile.Sources {
			cleanURL := strings.ToLower(strings.TrimSpace(src.URL))
			if cleanURL == "" || existingMap[cleanURL] {
				continue
			}
			if _, err := s.plugins.Sources().AddSource(src); err == nil {
				result.SourcesAdded++
				existingMap[cleanURL] = true
			}
		}
	}

	// 3. Auto-install plugins if requested
	if req.AutoInstallPlugins {
		installed, _ := s.plugins.ListPlugins()
		installedMap := make(map[string]bool)
		for _, p := range installed {
			installedMap[p.Manifest.ID] = true
		}

		for _, p := range req.Profile.Plugins {
			if installedMap[p.ID] {
				// Ensure enabled state matches profile
				_ = s.plugins.TogglePlugin(p.ID, p.Enabled)
				continue
			}

			// If source URL is available, auto-install from URL
			if p.SourceURL != "" && (strings.HasPrefix(p.SourceURL, "http://") || strings.HasPrefix(p.SourceURL, "https://")) {
				if strings.HasSuffix(p.SourceURL, ".zip") {
					if _, err := s.plugins.InstallFromURL(p.SourceURL); err == nil {
						result.PluginsQueued = append(result.PluginsQueued, p.ID)
					} else {
						result.Errors = append(result.Errors, fmt.Sprintf("failed to install plugin %s: %v", p.ID, err))
					}
				}
			}
		}
	}

	if s.audit != nil {
		_ = s.audit.Log(audit.Event{
			User:     s.getAuditUser(r),
			IP:       r.RemoteAddr,
			Action:   "profile.import",
			Severity: audit.SeverityWarn,
			Details: map[string]any{
				"settingsApplied": result.SettingsApplied,
				"sourcesAdded":    result.SourcesAdded,
				"pluginsCount":    len(result.PluginsQueued),
			},
		})
	}

	jsonResponse(w, http.StatusOK, result)
}
