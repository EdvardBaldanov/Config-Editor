package audit

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAuditLogger(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cs-audit-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	logger, err := NewLogger(tmpDir)
	if err != nil {
		t.Fatalf("failed to create audit logger: %v", err)
	}
	defer logger.Close()

	// Log some test events
	e1 := Event{
		User:     "admin",
		IP:       "127.0.0.1",
		Action:   ActionFileSave,
		Severity: SeverityInfo,
		Target:   "nginx.conf",
		Details:  map[string]any{"bytes": 1024},
	}
	if err := logger.Log(e1); err != nil {
		t.Fatalf("failed to log e1: %v", err)
	}

	e2 := Event{
		User:     "dev",
		IP:       "192.168.1.50",
		Action:   ActionFileForceSave,
		Severity: SeverityWarn,
		Target:   "docker-compose.yml",
		Details:  map[string]any{"warning": "syntax error on line 12"},
	}
	if err := logger.Log(e2); err != nil {
		t.Fatalf("failed to log e2: %v", err)
	}

	e3 := Event{
		User:     "admin",
		IP:       "127.0.0.1",
		Action:   ActionShellExec,
		Severity: SeverityCritical,
		Target:   "config-studio-docker",
		Details:  map[string]any{"command": "docker compose down", "exitCode": 1},
	}
	if err := logger.Log(e3); err != nil {
		t.Fatalf("failed to log e3: %v", err)
	}

	// 1. Query all (should be 3 events, newest first)
	res := logger.Query(QueryFilter{Limit: 10, Offset: 0})
	if res.Total != 3 {
		t.Errorf("expected total 3, got %d", res.Total)
	}
	if len(res.Events) != 3 {
		t.Errorf("expected 3 events, got %d", len(res.Events))
	}
	if res.Events[0].Action != ActionShellExec {
		t.Errorf("expected first event to be ShellExec (newest), got %s", res.Events[0].Action)
	}

	// 2. Filter by Severity
	resWarn := logger.Query(QueryFilter{Severity: SeverityWarn})
	if resWarn.Total != 1 || resWarn.Events[0].Target != "docker-compose.yml" {
		t.Errorf("expected 1 warn event for docker-compose.yml, got %+v", resWarn)
	}

	// 3. Filter by Search
	resSearch := logger.Query(QueryFilter{Search: "nginx"})
	if resSearch.Total != 1 || resSearch.Events[0].Target != "nginx.conf" {
		t.Errorf("expected 1 search result for nginx, got %+v", resSearch)
	}

	// 4. Verify disk persistence by reopening
	logger.Close()
	logger2, err := NewLogger(tmpDir)
	if err != nil {
		t.Fatalf("failed to reopen audit logger: %v", err)
	}
	defer logger2.Close()

	resReopen := logger2.Query(QueryFilter{})
	if resReopen.Total != 3 {
		t.Errorf("expected 3 events after reload from disk, got %d", resReopen.Total)
	}

	// Verify file exists
	if _, err := os.Stat(filepath.Join(tmpDir, "audit.jsonl")); err != nil {
		t.Errorf("audit.jsonl does not exist: %v", err)
	}
}
