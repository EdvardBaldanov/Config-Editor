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
	"config-studio/internal/secrets"
)

func TestServerStructureGuard(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cs-server-guard-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	cfgMgr, err := config.NewManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create config manager: %v", err)
	}

	workDir, err := os.MkdirTemp("", "cs-workdir-guard-*")
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

	secMgr, err := secrets.NewManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create secrets manager: %v", err)
	}

	srv := NewServer(Config{}, cfgMgr, fsSvc, pMgr, runner, auditLogger, secMgr)

	// 1. Try to save broken docker-compose.yml without force -> MUST return 422
	brokenYAML := "version: '3.8'\nservices:\n  web:\n    image nginx:alpine\n    ports:\n"
	reqBody, _ := json.Marshal(map[string]any{
		"path":    "docker-compose.yml",
		"content": brokenYAML,
		"backup":  false,
		"force":   false,
	})

	req := httptest.NewRequest("POST", "/api/fs/file", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-ConfigStudio-Web", "1")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected HTTP 422 for broken docker-compose.yml, got %d. Body: %s", rec.Code, rec.Body.String())
	}

	var errResp map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("failed to parse 422 response: %v", err)
	}
	if errResp["guard"] == nil {
		t.Fatalf("expected guard field in response: %+v", errResp)
	}

	// 2. Save broken docker-compose.yml WITH force=true -> MUST succeed with 200 and audit file.forcesave
	forceBody, _ := json.Marshal(map[string]any{
		"path":    "docker-compose.yml",
		"content": brokenYAML,
		"backup":  false,
		"force":   true,
	})

	req2 := httptest.NewRequest("POST", "/api/fs/file", bytes.NewReader(forceBody))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("X-ConfigStudio-Web", "1")
	rec2 := httptest.NewRecorder()
	srv.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200 for force save, got %d. Body: %s", rec2.Code, rec2.Body.String())
	}

	// Verify audit log has file.forcesave
	resQuery := auditLogger.Query(audit.QueryFilter{Action: audit.ActionFileForceSave})
	if len(resQuery.Events) == 0 {
		t.Fatalf("expected audit log to record file.forcesave event, got count=%d", len(resQuery.Events))
	}

	// 3. Test /api/guard/validate endpoint
	valBody, _ := json.Marshal(map[string]any{
		"path":    "nginx.conf",
		"content": "server {\n  listen 80;\n", // unclosed brace
	})
	req3 := httptest.NewRequest("POST", "/api/guard/validate", bytes.NewReader(valBody))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("X-ConfigStudio-Web", "1")
	rec3 := httptest.NewRecorder()
	srv.ServeHTTP(rec3, req3)

	if rec3.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200 for guard validate, got %d", rec3.Code)
	}

	var valResp map[string]any
	if err := json.Unmarshal(rec3.Body.Bytes(), &valResp); err != nil {
		t.Fatalf("failed to decode validate response: %v", err)
	}
	if valResp["valid"] != false {
		t.Errorf("expected valid=false for unclosed nginx.conf block, got: %v", valResp["valid"])
	}
	if valResp["isGuarded"] != true {
		t.Errorf("expected isGuarded=true for nginx.conf, got: %v", valResp["isGuarded"])
	}
}
