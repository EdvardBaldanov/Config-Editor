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
