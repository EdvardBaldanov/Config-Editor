package plugin

import (
	"archive/zip"
	"bytes"
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
	pluginsDir string
	runner     *Runner
	mu         sync.RWMutex
	state      map[string]bool // pluginId -> enabled
}

func NewManager(dataDir string, runner *Runner) (*Manager, error) {
	pluginsDir := filepath.Join(dataDir, "plugins")
	if err := os.MkdirAll(pluginsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create plugins directory: %w", err)
	}

	m := &Manager{
		pluginsDir: pluginsDir,
		runner:     runner,
		state:      make(map[string]bool),
	}

	m.loadState()
	m.seedDefaultPlugins()

	return m, nil
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
			Builtin:     manifest.ID == "web-devkit" || manifest.ID == "remote-agent",
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
			return &Plugin{
				Manifest: manifest,
				Dir:      pDir,
			}, nil
		}
	}
	return nil, fmt.Errorf("plugin %s not found", id)
}

// InstallFromZip extracts a zip archive and registers the plugin.
func (m *Manager) InstallFromZip(r io.Reader, size int64) (*Plugin, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	zipReader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("invalid zip archive: %w", err)
	}

	// Create a temporary extraction directory
	tmpDir, err := os.MkdirTemp("", "cs-plugin-extract-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tmpDir)

	// Extract files with zip-slip safety check
	for _, f := range zipReader.File {
		cleanPath := filepath.Clean(f.Name)
		if strings.HasPrefix(cleanPath, "..") || strings.Contains(cleanPath, ":") {
			return nil, fmt.Errorf("insecure path in zip archive: %s", f.Name)
		}

		targetPath := filepath.Join(tmpDir, cleanPath)
		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(targetPath, 0755)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return nil, err
		}

		outFile, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return nil, err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return nil, err
		}

		_, err = io.Copy(outFile, rc)
		rc.Close()
		outFile.Close()
		if err != nil {
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
		return nil, errors.New("archive does not contain a plugin.json manifest")
	}

	manifestBytes, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, err
	}

	var manifest Manifest
	if err := json.Unmarshal(manifestBytes, &manifest); err != nil {
		return nil, fmt.Errorf("invalid plugin.json: %w", err)
	}

	if manifest.ID == "" {
		return nil, errors.New("plugin.json is missing 'id' field")
	}

	// The folder containing plugin.json is the plugin root
	srcDir := filepath.Dir(manifestPath)
	destDir := filepath.Join(m.pluginsDir, manifest.ID)

	// Overwrite or create destination
	_ = os.RemoveAll(destDir)
	if err := copyDir(srcDir, destDir); err != nil {
		return nil, fmt.Errorf("failed to install plugin files: %w", err)
	}

	m.mu.Lock()
	m.state[manifest.ID] = true
	_ = m.saveState()
	m.mu.Unlock()

	return m.GetPlugin(manifest.ID)
}

// InstallFromURL downloads a zip or GitHub repo and installs it.
func (m *Manager) InstallFromURL(rawURL string) (*Plugin, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, errors.New("URL is required")
	}

	downloadURL := rawURL
	// If it's a GitHub repo URL (e.g. https://github.com/author/repo or https://github.com/author/repo.git)
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

	// If main branch fails, try master branch on GitHub
	if resp.StatusCode == http.StatusNotFound && strings.Contains(downloadURL, "/refs/heads/main.zip") {
		masterURL := strings.Replace(downloadURL, "/refs/heads/main.zip", "/refs/heads/master.zip", 1)
		resp2, err2 := client.Get(masterURL)
		if err2 == nil && resp2.StatusCode == http.StatusOK {
			defer resp2.Body.Close()
			return m.InstallFromZip(resp2.Body, resp2.ContentLength)
		}
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed with HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	return m.InstallFromZip(resp.Body, resp.ContentLength)
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
