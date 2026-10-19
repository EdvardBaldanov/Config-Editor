package plugin

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Manager struct {
	pluginsDir      string
	runner          *Runner
	sources         *SourcesManager
	mu              sync.RWMutex
	state           map[string]bool // pluginId -> enabled
	pendingInstalls map[string]*PendingInstall
}

func NewManager(dataDir string, runner *Runner) (*Manager, error) {
	pluginsDir := filepath.Join(dataDir, "plugins")
	if err := os.MkdirAll(pluginsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create plugins directory: %w", err)
	}

	sm, err := NewSourcesManager(pluginsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize sources manager: %w", err)
	}

	m := &Manager{
		pluginsDir:      pluginsDir,
		runner:          runner,
		sources:         sm,
		state:           make(map[string]bool),
		pendingInstalls: make(map[string]*PendingInstall),
	}

	m.loadState()

	return m, nil
}

func (m *Manager) Sources() *SourcesManager {
	return m.sources
}

func (m *Manager) stateFilePath() string {
	return filepath.Join(m.pluginsDir, "state.json")
}

func (m *Manager) loadState() {
	data, err := os.ReadFile(m.stateFilePath())
	if err != nil {
		return
	}
	_ = json.Unmarshal(data, &m.state)
}

func (m *Manager) saveState() error {
	data, err := json.MarshalIndent(m.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.stateFilePath(), data, 0644)
}

// enrichManifestLocales populates and merges locales and language packs from the plugin directory.
func enrichManifestLocales(manifest *Manifest, pluginDir string) {
	if manifest.Locales == nil {
		manifest.Locales = make(map[string]map[string]string)
	}

	// 1. Scan locales/ folder if present (e.g. locales/ru.json, locales/en.json, locales/de.json)
	localesDir := filepath.Join(pluginDir, "locales")
	if stat, err := os.Stat(localesDir); err == nil && stat.IsDir() {
		files, _ := os.ReadDir(localesDir)
		for _, f := range files {
			if !f.IsDir() && strings.HasSuffix(strings.ToLower(f.Name()), ".json") {
				langCode := strings.TrimSuffix(strings.ToLower(f.Name()), ".json")
				content, err := os.ReadFile(filepath.Join(localesDir, f.Name()))
				if err == nil {
					var dict map[string]string
					if err := json.Unmarshal(content, &dict); err == nil && len(dict) > 0 {
						if manifest.Locales[langCode] == nil {
							manifest.Locales[langCode] = dict
						} else {
							for k, v := range dict {
								manifest.Locales[langCode][k] = v
							}
						}
					}
				}
			}
		}
	}

	// 2. Check if a dedicated localization.json exists for a full language pack plugin
	if manifest.Localization == nil {
		locPackFile := filepath.Join(pluginDir, "localization.json")
		if content, err := os.ReadFile(locPackFile); err == nil {
			var pack LanguagePackDef
			if err := json.Unmarshal(content, &pack); err == nil && pack.Code != "" {
				manifest.Localization = &pack
			}
		}
	}

	// If Locales map ended up completely empty, clean it up to avoid empty {} in JSON
	if len(manifest.Locales) == 0 {
		manifest.Locales = nil
	}
}

// ListPlugins scans the plugins directory and returns all installed plugins.
func (m *Manager) ListPlugins() ([]Plugin, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	entries, err := os.ReadDir(m.pluginsDir)
	if err != nil {
		return nil, err
	}

	var plugins []Plugin
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		pDir := filepath.Join(m.pluginsDir, entry.Name())
		manifestPath := filepath.Join(pDir, "plugin.json")
		if _, err := os.Stat(manifestPath); err != nil {
			continue
		}

		manifestData, err := os.ReadFile(manifestPath)
		if err != nil {
			continue
		}

		var manifest Manifest
		if err := json.Unmarshal(manifestData, &manifest); err != nil {
			continue
		}

		if manifest.ID == "" {
			manifest.ID = entry.Name()
		}

		enrichManifestLocales(&manifest, pDir)

		enabled, ok := m.state[manifest.ID]
		if !ok {
			enabled = true // default enabled
		}

		info, _ := entry.Info()
		var installedAt time.Time
		if info != nil {
			installedAt = info.ModTime()
		} else {
			installedAt = time.Now()
		}

		plugins = append(plugins, Plugin{
			Manifest:    manifest,
			Enabled:     enabled,
			Dir:         pDir,
			InstalledAt: installedAt,
			Builtin:     false,
		})
	}

	return plugins, nil
}

// GetPlugin returns a single plugin by ID.
func (m *Manager) GetPlugin(id string) (*Plugin, error) {
	plugins, err := m.ListPlugins()
	if err != nil {
		return nil, err
	}
	for _, p := range plugins {
		if p.ID == id {
			return &p, nil
		}
	}
	return nil, fmt.Errorf("plugin %s not found", id)
}

// TogglePlugin enables or disables a plugin.
func (m *Manager) TogglePlugin(id string, enabled bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.state[id] = enabled
	if !enabled && m.runner != nil {
		m.runner.StopAllForPlugin(id)
	}
	return m.saveState()
}

// DeletePlugin removes a plugin folder completely.
func (m *Manager) DeletePlugin(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	p, err := m.getPluginLocked(id)
	if err != nil {
		return err
	}

	if m.runner != nil {
		m.runner.StopAllForPlugin(id)
	}

	if err := os.RemoveAll(p.Dir); err != nil {
		return fmt.Errorf("failed to remove plugin directory: %w", err)
	}

	delete(m.state, id)
	_ = m.saveState()
	return nil
}

func (m *Manager) getPluginLocked(id string) (*Plugin, error) {
	entries, err := os.ReadDir(m.pluginsDir)
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		pDir := filepath.Join(m.pluginsDir, entry.Name())
		manifestPath := filepath.Join(pDir, "plugin.json")
		data, err := os.ReadFile(manifestPath)
		if err != nil {
			continue
		}
		var manifest Manifest
		if err := json.Unmarshal(data, &manifest); err != nil {
			continue
		}
		if manifest.ID == id || entry.Name() == id {
			enrichManifestLocales(&manifest, pDir)
			return &Plugin{
				Manifest: manifest,
				Dir:      pDir,
			}, nil
		}
	}
	return nil, fmt.Errorf("plugin %s not found", id)
}

// InspectZip extracts a zip archive to a temporary staging folder,
// parses and validates plugin.json, and returns PendingInstall metadata.
func (m *Manager) InspectZip(r io.Reader, size int64, sourceURL string) (*PendingInstall, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	zipReader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("invalid zip archive: %w", err)
	}

	// Create a temporary extraction directory
	tmpDir, err := os.MkdirTemp("", "cs-plugin-inspect-*")
	if err != nil {
		return nil, err
	}

	// Extract files with zip-slip safety check
	for _, f := range zipReader.File {
		cleanPath := filepath.Clean(f.Name)
		if strings.HasPrefix(cleanPath, "..") || strings.Contains(cleanPath, ":") {
			_ = os.RemoveAll(tmpDir)
			return nil, fmt.Errorf("insecure path in zip archive: %s", f.Name)
		}

		targetPath := filepath.Join(tmpDir, cleanPath)
		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(targetPath, 0755)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			_ = os.RemoveAll(tmpDir)
			return nil, err
		}

		outFile, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			_ = os.RemoveAll(tmpDir)
			return nil, err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			_ = os.RemoveAll(tmpDir)
			return nil, err
		}

		_, err = io.Copy(outFile, rc)
		rc.Close()
		outFile.Close()
		if err != nil {
			_ = os.RemoveAll(tmpDir)
			return nil, err
		}
	}

	// Locate plugin.json in extracted files
	var manifestPath string
	_ = filepath.Walk(tmpDir, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() && filepath.Base(path) == "plugin.json" {
			manifestPath = path
			return io.EOF
		}
		return nil
	})

	if manifestPath == "" {
		_ = os.RemoveAll(tmpDir)
		return nil, errors.New("archive does not contain a plugin.json manifest")
	}

	manifestBytes, err := os.ReadFile(manifestPath)
	if err != nil {
		_ = os.RemoveAll(tmpDir)
		return nil, err
	}

	var manifest Manifest
	if err := json.Unmarshal(manifestBytes, &manifest); err != nil {
		_ = os.RemoveAll(tmpDir)
		return nil, fmt.Errorf("invalid plugin.json: %w", err)
	}

	if manifest.ID == "" {
		_ = os.RemoveAll(tmpDir)
		return nil, errors.New("plugin.json is missing 'id' field")
	}

	pluginDir := filepath.Dir(manifestPath)
	enrichManifestLocales(&manifest, pluginDir)

	// Determine if official
	isOfficial := false
	authorLower := strings.ToLower(manifest.Author)
	if authorLower == "configstudio" || authorLower == "config studio" || authorLower == "config studio team" || strings.Contains(strings.ToLower(sourceURL), "github.com/edvardbaldanov/config-studio-") {
		isOfficial = true
	}

	tempKey := generateTempKey()
	pending := &PendingInstall{
		TempKey:    tempKey,
		Manifest:   manifest,
		IsOfficial: isOfficial,
		TempDir:    tmpDir,
		PluginDir:  pluginDir,
		CreatedAt:  time.Now(),
	}

	m.mu.Lock()
	m.cleanupPendingInstallsLocked()
	m.pendingInstalls[tempKey] = pending
	m.mu.Unlock()

	return pending, nil
}

// InspectURL downloads a zip or GitHub repo and inspects its manifest.
func (m *Manager) InspectURL(rawURL string) (*PendingInstall, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, errors.New("URL is required")
	}

	downloadURL := rawURL
	if strings.Contains(downloadURL, "github.com/") && !strings.HasSuffix(downloadURL, ".zip") {
		clean := strings.TrimSuffix(downloadURL, ".git")
		clean = strings.TrimSuffix(clean, "/")
		downloadURL = clean + "/archive/refs/heads/main.zip"
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Get(downloadURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch plugin from URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound && strings.Contains(downloadURL, "/refs/heads/main.zip") {
		masterURL := strings.Replace(downloadURL, "/refs/heads/main.zip", "/refs/heads/master.zip", 1)
		resp2, err2 := client.Get(masterURL)
		if err2 == nil && resp2.StatusCode == http.StatusOK {
			defer resp2.Body.Close()
			return m.InspectZip(resp2.Body, resp2.ContentLength, rawURL)
		}
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed with HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	return m.InspectZip(resp.Body, resp.ContentLength, rawURL)
}

// ConfirmInstall finalizes plugin installation after user consent.
func (m *Manager) ConfirmInstall(tempKey string) (*Plugin, error) {
	m.mu.Lock()
	pending, ok := m.pendingInstalls[tempKey]
	if !ok {
		m.mu.Unlock()
		return nil, fmt.Errorf("pending installation %q not found or expired", tempKey)
	}
	delete(m.pendingInstalls, tempKey)
	m.mu.Unlock()

	defer os.RemoveAll(pending.TempDir)

	destDir := filepath.Join(m.pluginsDir, pending.Manifest.ID)
	_ = os.RemoveAll(destDir)
	if err := copyDir(pending.PluginDir, destDir); err != nil {
		return nil, fmt.Errorf("failed to copy plugin files: %w", err)
	}

	m.mu.Lock()
	m.state[pending.Manifest.ID] = true
	_ = m.saveState()
	m.mu.Unlock()

	return m.GetPlugin(pending.Manifest.ID)
}

// CancelInstall discards an inspected pending plugin.
func (m *Manager) CancelInstall(tempKey string) error {
	m.mu.Lock()
	pending, ok := m.pendingInstalls[tempKey]
	if ok {
		delete(m.pendingInstalls, tempKey)
	}
	m.mu.Unlock()

	if pending != nil && pending.TempDir != "" {
		_ = os.RemoveAll(pending.TempDir)
	}
	return nil
}

func (m *Manager) cleanupPendingInstallsLocked() {
	now := time.Now()
	for k, p := range m.pendingInstalls {
		if now.Sub(p.CreatedAt) > 15*time.Minute {
			_ = os.RemoveAll(p.TempDir)
			delete(m.pendingInstalls, k)
		}
	}
}

func generateTempKey() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return fmt.Sprintf("tmp_%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// InstallFromZip extracts a zip archive and registers the plugin directly (legacy/auto-flow).
func (m *Manager) InstallFromZip(r io.Reader, size int64) (*Plugin, error) {
	pending, err := m.InspectZip(r, size, "")
	if err != nil {
		return nil, err
	}
	return m.ConfirmInstall(pending.TempKey)
}

// InstallFromURL downloads a zip or GitHub repo and installs it directly (legacy/auto-flow).
func (m *Manager) InstallFromURL(rawURL string) (*Plugin, error) {
	pending, err := m.InspectURL(rawURL)
	if err != nil {
		return nil, err
	}
	return m.ConfirmInstall(pending.TempKey)
}

// ServeFile safely serves plugin asset files (JS, CSS, images).
func (m *Manager) ServeFile(w http.ResponseWriter, r *http.Request, pluginID, relPath string) {
	p, err := m.GetPlugin(pluginID)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	cleanRel := filepath.Clean(strings.TrimPrefix(relPath, "/"))
	if strings.HasPrefix(cleanRel, "..") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	target := filepath.Join(p.Dir, cleanRel)
	info, err := os.Stat(target)
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}

	// Set appropriate Content-Type
	switch filepath.Ext(target) {
	case ".js", ".mjs":
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	case ".css":
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	case ".json":
		w.Header().Set("Content-Type", "application/json")
	case ".svg":
		w.Header().Set("Content-Type", "image/svg+xml")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	}

	w.Header().Set("Cache-Control", "no-cache")
	http.ServeFile(w, r, target)
}

func copyDir(src string, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		return copyFile(path, target)
	})
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
