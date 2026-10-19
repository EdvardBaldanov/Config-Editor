package plugin

import (
	"archive/zip"
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func createTestPluginZip(t *testing.T, id, name, author string, permissions []string) []byte {
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	manifestJSON := `{
		"id": "` + id + `",
		"name": "` + name + `",
		"version": "1.0.0",
		"author": "` + author + `",
		"entry": "main.js",
		"permissions": ["` + permissions[0] + `"]
	}`

	w, err := zw.Create("plugin.json")
	if err != nil {
		t.Fatalf("failed to create zip entry: %v", err)
	}
	if _, err := w.Write([]byte(manifestJSON)); err != nil {
		t.Fatalf("failed to write manifest: %v", err)
	}

	w2, err := zw.Create("main.js")
	if err != nil {
		t.Fatalf("failed to create main.js entry: %v", err)
	}
	if _, err := w2.Write([]byte("console.log('hello');")); err != nil {
		t.Fatalf("failed to write main.js: %v", err)
	}

	if err := zw.Close(); err != nil {
		t.Fatalf("failed to close zip writer: %v", err)
	}

	return buf.Bytes()
}

func TestInspectAndConfirmInstall(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cs-test-plugin-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	mgr, err := NewManager(tempDir, nil)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	zipData := createTestPluginZip(t, "sample-plugin", "Sample Plugin", "ConfigStudio", []string{"shell.exec"})

	// 1. Inspect
	pending, err := mgr.InspectZip(bytes.NewReader(zipData), int64(len(zipData)), "")
	if err != nil {
		t.Fatalf("InspectZip failed: %v", err)
	}

	if pending.TempKey == "" {
		t.Errorf("expected TempKey to be non-empty")
	}
	if pending.Manifest.ID != "sample-plugin" {
		t.Errorf("expected ID 'sample-plugin', got %q", pending.Manifest.ID)
	}
	if !pending.IsOfficial {
		t.Errorf("expected IsOfficial to be true for ConfigStudio author")
	}

	// 2. Confirm Install
	installed, err := mgr.ConfirmInstall(pending.TempKey)
	if err != nil {
		t.Fatalf("ConfirmInstall failed: %v", err)
	}

	if installed.ID != "sample-plugin" {
		t.Errorf("expected installed plugin ID 'sample-plugin', got %q", installed.ID)
	}

	// Check if installed on disk
	expectedFile := filepath.Join(tempDir, "plugins", "sample-plugin", "main.js")
	if _, err := os.Stat(expectedFile); err != nil {
		t.Errorf("expected file %s to exist: %v", expectedFile, err)
	}

	// Check if pending was removed
	mgr.mu.RLock()
	_, exists := mgr.pendingInstalls[pending.TempKey]
	mgr.mu.RUnlock()
	if exists {
		t.Errorf("expected pending install to be removed after confirmation")
	}
}

func TestInspectAndCancelInstall(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cs-test-plugin-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	mgr, err := NewManager(tempDir, nil)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	zipData := createTestPluginZip(t, "cancel-plugin", "Cancel Plugin", "CommunityDev", []string{"network"})

	pending, err := mgr.InspectZip(bytes.NewReader(zipData), int64(len(zipData)), "")
	if err != nil {
		t.Fatalf("InspectZip failed: %v", err)
	}

	if pending.IsOfficial {
		t.Errorf("expected IsOfficial to be false for CommunityDev author")
	}

	// Cancel
	if err := mgr.CancelInstall(pending.TempKey); err != nil {
		t.Fatalf("CancelInstall failed: %v", err)
	}

	// Check if destination was not created
	destDir := filepath.Join(tempDir, "plugins", "cancel-plugin")
	if _, err := os.Stat(destDir); !os.IsNotExist(err) {
		t.Errorf("expected destination dir %s to not exist", destDir)
	}
}

func TestValidateCommandStrictConfirmation(t *testing.T) {
	// Risky command with unrestricted=true but confirmed=false should still require confirmation
	err := ValidateCommand("rm", []string{"-rf", "some_dir"}, true, false)
	if err == nil {
		t.Errorf("expected risky command to require confirmation even when unrestricted=true")
	}

	// With confirmed=true, it should pass
	err = ValidateCommand("rm", []string{"-rf", "some_dir"}, true, true)
	if err != nil {
		t.Errorf("expected confirmed command to pass, got: %v", err)
	}

	// Strict blacklist should NEVER pass, even if confirmed=true
	err = ValidateCommand("rm", []string{"-rf", "/"}, true, true)
	if err == nil {
		t.Errorf("expected blacklisted command 'rm -rf /' to be rejected even if confirmed")
	}
}

func TestPluginLocalesAndLocalization(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "cs-test-locales-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	pluginsDir := filepath.Join(tempDir, "plugins")
	pDir := filepath.Join(pluginsDir, "demo-plugin")
	localesDir := filepath.Join(pDir, "locales")
	if err := os.MkdirAll(localesDir, 0755); err != nil {
		t.Fatalf("failed to create locales dir: %v", err)
	}

	// 1. plugin.json with inline locales and metadata
	manifestJSON := `{
		"id": "demo-plugin",
		"name": "Demo Plugin",
		"version": "1.0.0",
		"entry": "main.js",
		"locales": {
			"ru": {
				"name": "Демо плагин",
				"greeting": "Привет"
			}
		}
	}`
	_ = os.WriteFile(filepath.Join(pDir, "plugin.json"), []byte(manifestJSON), 0644)
	_ = os.WriteFile(filepath.Join(pDir, "main.js"), []byte("// demo"), 0644)

	// 2. Separate file in locales/en.json and override/add in locales/ru.json
	_ = os.WriteFile(filepath.Join(localesDir, "en.json"), []byte(`{"name":"Demo Plugin EN","greeting":"Hello"}`), 0644)
	_ = os.WriteFile(filepath.Join(localesDir, "ru.json"), []byte(`{"description":"Описание из файла"}`), 0644)

	// 3. localization.json for whole UI language pack
	_ = os.WriteFile(filepath.Join(pDir, "localization.json"), []byte(`{
		"code": "de",
		"name": "Deutsch",
		"flag": "🇩🇪",
		"translations": { "save": "Speichern" }
	}`), 0644)

	mgr, err := NewManager(tempDir, nil)
	if err != nil {
		t.Fatalf("failed to create manager: %v", err)
	}

	plugins, err := mgr.ListPlugins()
	if err != nil {
		t.Fatalf("ListPlugins failed: %v", err)
	}

	if len(plugins) != 1 {
		t.Fatalf("expected 1 plugin, got %d", len(plugins))
	}

	p := plugins[0]
	if p.Locales == nil {
		t.Fatalf("expected p.Locales to not be nil")
	}

	// Verify inline ru.greeting was preserved and file ru.description was merged
	if p.Locales["ru"]["greeting"] != "Привет" {
		t.Errorf("expected ru greeting 'Привет', got %q", p.Locales["ru"]["greeting"])
	}
	if p.Locales["ru"]["description"] != "Описание из файла" {
		t.Errorf("expected ru description 'Описание из файла', got %q", p.Locales["ru"]["description"])
	}

	// Verify en.json was loaded
	if p.Locales["en"]["greeting"] != "Hello" {
		t.Errorf("expected en greeting 'Hello', got %q", p.Locales["en"]["greeting"])
	}

	// Verify localization language pack was populated
	if p.Localization == nil {
		t.Fatalf("expected p.Localization to not be nil")
	}
	if p.Localization.Code != "de" || p.Localization.Name != "Deutsch" || p.Localization.Translations["save"] != "Speichern" {
		t.Errorf("unexpected localization pack: %+v", p.Localization)
	}
}
