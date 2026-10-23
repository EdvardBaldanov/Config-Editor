package cspkg

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPackInspectUnpack(t *testing.T) {
	tmpDir := t.TempDir()
	pluginDir := filepath.Join(tmpDir, "test-plugin")
	_ = os.MkdirAll(pluginDir, 0755)

	manifestContent := `{
		"id": "sample-plugin",
		"name": "Sample Plugin",
		"version": "1.0.0",
		"description": "Test plugin packaging",
		"author": "Tester"
	}`
	_ = os.WriteFile(filepath.Join(pluginDir, "plugin.json"), []byte(manifestContent), 0644)
	_ = os.WriteFile(filepath.Join(pluginDir, "index.js"), []byte("console.log('hello');"), 0644)

	cspkgPath := filepath.Join(tmpDir, "sample-plugin.cspkg")

	// 1. Pack
	info, err := Pack(pluginDir, cspkgPath)
	if err != nil {
		t.Fatalf("Pack failed: %v", err)
	}

	if info.ID != "sample-plugin" || info.Version != "1.0.0" {
		t.Errorf("Unexpected info: %+v", info)
	}
	if len(info.Files) != 2 {
		t.Errorf("Expected 2 files, got %d", len(info.Files))
	}

	// 2. Inspect
	inspected, err := Inspect(cspkgPath)
	if err != nil {
		t.Fatalf("Inspect failed: %v", err)
	}
	if inspected.Checksum != info.Checksum {
		t.Errorf("Checksum mismatch: %s != %s", inspected.Checksum, info.Checksum)
	}

	// 3. Unpack
	unpackDir := filepath.Join(tmpDir, "unpacked")
	unpackedInfo, err := Unpack(cspkgPath, unpackDir)
	if err != nil {
		t.Fatalf("Unpack failed: %v", err)
	}
	if unpackedInfo.ID != "sample-plugin" {
		t.Errorf("Unpack ID mismatch: %s", unpackedInfo.ID)
	}

	indexJsContent, err := os.ReadFile(filepath.Join(unpackDir, "index.js"))
	if err != nil || string(indexJsContent) != "console.log('hello');" {
		t.Errorf("Unpacked index.js content mismatch")
	}

	// 4. Tamper / corruption test
	corruptBytes, _ := os.ReadFile(cspkgPath)
	corruptBytes[len(corruptBytes)-1] ^= 0xFF // Flip last byte
	_, err = InspectBytes(corruptBytes)
	if err != ErrCorruptPackage {
		t.Errorf("Expected ErrCorruptPackage, got %v", err)
	}
}
