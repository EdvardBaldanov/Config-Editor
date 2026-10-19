package plugin

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestSourcesManager(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cs-sources-test-*")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	sm, err := NewSourcesManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create SourcesManager: %v", err)
	}

	sources := sm.ListSources()
	if len(sources) < 2 {
		t.Fatalf("expected at least 2 default sources, got %d", len(sources))
	}

	// Verify official source cannot be deleted
	if err := sm.DeleteSource("official"); err == nil {
		t.Fatalf("expected error deleting official source, got nil")
	}

	// Add custom source
	added, err := sm.AddSource(Source{
		Name: "Internal Team Plugins",
		URL:  "https://example.com/team-plugins.json",
	})
	if err != nil {
		t.Fatalf("failed to add source: %v", err)
	}

	if added.Official {
		t.Errorf("custom source should not be official")
	}

	// Verify it shows up in list
	sources = sm.ListSources()
	if len(sources) != 3 {
		t.Fatalf("expected 3 sources, got %d", len(sources))
	}

	// Update source
	err = sm.UpdateSource(added.ID, Source{
		Name:    "Internal Team Plugins (Updated)",
		URL:     added.URL,
		Enabled: false,
	})
	if err != nil {
		t.Fatalf("failed to update source: %v", err)
	}

	// Verify update
	sources = sm.ListSources()
	var found *Source
	for _, s := range sources {
		if s.ID == added.ID {
			found = &s
			break
		}
	}
	if found == nil || found.Enabled || found.Name != "Internal Team Plugins (Updated)" {
		t.Fatalf("source was not updated correctly: %+v", found)
	}

	// Delete custom source
	if err := sm.DeleteSource(added.ID); err != nil {
		t.Fatalf("failed to delete custom source: %v", err)
	}

	if len(sm.ListSources()) != 2 {
		t.Fatalf("expected 2 sources after deletion, got %d", len(sm.ListSources()))
	}
}

func TestProfileExportPreview(t *testing.T) {
	appSettings := ProfileAppSettings{
		AppTitle:              "My Custom Studio",
		BaseColor:             "#1e1e1e",
		AccentColor:           "#ff5500",
		ThemeMode:             "dark",
		Language:              "ru",
		BottomDockMode:        "always",
		StructureGuardEnabled: true,
		CriticalPatterns:      []string{"nginx.conf"},
	}

	sources := []Source{
		{ID: "official", Name: "Official", URL: "https://example.com/official.json", Official: true, Enabled: true},
	}

	plugins := []Plugin{
		{
			Manifest: Manifest{
				ID:      "test-plugin",
				Name:    "Test Plugin",
				Version: "1.0.0",
			},
			Enabled: true,
		},
	}

	prof := GenerateProfile(appSettings, sources, plugins)
	if prof.App.AppTitle != "My Custom Studio" {
		t.Errorf("unexpected AppTitle: %s", prof.App.AppTitle)
	}
	if len(prof.Plugins) != 1 || prof.Plugins[0].ID != "test-plugin" {
		t.Fatalf("unexpected plugins in profile: %+v", prof.Plugins)
	}

	// Preview against target environment
	targetApp := ProfileAppSettings{
		AppTitle:    "Default Studio",
		BaseColor:   "#000000",
		AccentColor: "#00d2b4",
	}
	targetSources := []Source{}
	targetPlugins := []Plugin{}

	preview, err := PreviewProfile(prof, targetApp, targetSources, targetPlugins)
	if err != nil {
		t.Fatalf("failed to preview profile: %v", err)
	}

	if len(preview.SettingsDiff) == 0 {
		t.Errorf("expected settings diff, got empty")
	}
	if len(preview.NewSources) != 1 {
		t.Errorf("expected 1 new source, got %d", len(preview.NewSources))
	}
	if len(preview.PluginsStatus) != 1 || preview.PluginsStatus[0].Action != "to_install" {
		t.Errorf("expected 1 plugin to install, got %+v", preview.PluginsStatus)
	}

	// Verify null-safety / empty slice serialization:
	// When previewing against an identical environment, all slices MUST serialize to `[]`, NOT `null`!
	samePreview, err := PreviewProfile(prof, appSettings, sources, plugins)
	if err != nil {
		t.Fatalf("failed to preview identical profile: %v", err)
	}
	previewBytes, err := json.Marshal(samePreview)
	if err != nil {
		t.Fatalf("failed to marshal preview: %v", err)
	}
	previewStr := string(previewBytes)
	if strings.Contains(previewStr, `"settingsDiff":null`) {
		t.Errorf("settingsDiff marshaled to null instead of []: %s", previewStr)
	}
	if strings.Contains(previewStr, `"newSources":null`) {
		t.Errorf("newSources marshaled to null instead of []: %s", previewStr)
	}
	if strings.Contains(previewStr, `"pluginsStatus":null`) {
		t.Errorf("pluginsStatus marshaled to null instead of []: %s", previewStr)
	}
}
