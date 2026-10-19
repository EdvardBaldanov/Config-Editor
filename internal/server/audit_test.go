package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"config-studio/internal/audit"
	"config-studio/internal/config"
	appfs "config-studio/internal/fs"
	"config-studio/internal/plugin"
)

func TestServerAuditLogging(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cs-server-audit-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	cfgMgr, err := config.NewManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create config manager: %v", err)
	}

	workDir, err := os.MkdirTemp("", "cs-workdir-*")
	if err != nil {
		t.Fatalf("failed to create work dir: %v", err)
	}
	defer os.RemoveAll(workDir)

	fsSvc, err := appfs.NewService(workDir)
	if err != nil {
		t.Fatalf("failed to create fs service: %v", err)
	}

	runner := plugin.NewRunner()
	defer runner.Shutdown()

	pMgr, err := plugin.NewManager(tmpDir, runner)
	if err != nil {
		t.Fatalf("failed to create plugin manager: %v", err)
	}

	auditLogger, err := audit.NewLogger(tmpDir)
	if err != nil {
		t.Fatalf("failed to create audit logger: %v", err)
	}
	defer auditLogger.Close()

	srv := NewServer(Config{}, cfgMgr, fsSvc, pMgr, runner, auditLogger)

	// 1. Save a file through the server
	savePayload := map[string]any{
		"path":    "test-config.yaml",
		"content": "key: value\nport: 8080",
		"backup":  false,
		"force":   false,
	}
	saveBody, _ := json.Marshal(savePayload)
	reqSave := httptest.NewRequest("POST", "/api/fs/file", bytes.NewReader(saveBody))
	reqSave.Header.Set("X-ConfigStudio-Web", "1")
	recSave := httptest.NewRecorder()
	srv.ServeHTTP(recSave, reqSave)

	if recSave.Code != http.StatusOK {
		t.Fatalf("expected status 200 on save, got %d: %s", recSave.Code, recSave.Body.String())
	}

	// 2. Query audit logs via GET /api/audit/logs
	reqAudit := httptest.NewRequest("GET", "/api/audit/logs", nil)
	reqAudit.Header.Set("X-ConfigStudio-Web", "1")
	recAudit := httptest.NewRecorder()
	srv.ServeHTTP(recAudit, reqAudit)

	if recAudit.Code != http.StatusOK {
		t.Fatalf("expected status 200 on audit logs, got %d: %s", recAudit.Code, recAudit.Body.String())
	}

	var auditRes audit.QueryResult
	if err := json.Unmarshal(recAudit.Body.Bytes(), &auditRes); err != nil {
		t.Fatalf("failed to unmarshal audit response: %v", err)
	}

	if auditRes.Total < 1 {
		t.Fatalf("expected at least 1 audit event, got %d", auditRes.Total)
	}

	lastEvt := auditRes.Events[0]
	if lastEvt.Action != audit.ActionFileSave {
		t.Errorf("expected action %q, got %q", audit.ActionFileSave, lastEvt.Action)
	}
	if lastEvt.Target != "test-config.yaml" {
		t.Errorf("expected target %q, got %q", "test-config.yaml", lastEvt.Target)
	}

	// 3. Test Export via GET /api/audit/export
	reqExport := httptest.NewRequest("GET", "/api/audit/export", nil)
	reqExport.Header.Set("X-ConfigStudio-Web", "1")
	recExport := httptest.NewRecorder()
	srv.ServeHTTP(recExport, reqExport)

	if recExport.Code != http.StatusOK {
		t.Fatalf("expected status 200 on export, got %d", recExport.Code)
	}
	if !bytes.Contains(recExport.Body.Bytes(), []byte("test-config.yaml")) {
		t.Errorf("expected export body to contain target file name")
	}
}
