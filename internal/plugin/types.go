package plugin

import "time"

// Manifest defines the structure of plugin.json inside a plugin directory.
type Manifest struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Version       string   `json:"version"`
	Description   string   `json:"description"`
	Author        string   `json:"author,omitempty"`
	Homepage      string   `json:"homepage,omitempty"`
	Icon          string   `json:"icon,omitempty"`          // Lucide icon name or svg
	Entry         string   `json:"entry"`                   // e.g. "main.js"
	CSS           string   `json:"css,omitempty"`           // optional "style.css"
	Permissions   []string `json:"permissions,omitempty"`   // e.g. ["ui.panels", "terminal.exec", "network.bind"]
	FileMatches   []string `json:"fileMatches,omitempty"`   // e.g. [".html", ".php", ".js"]
	MinAppVersion string   `json:"minAppVersion,omitempty"`
}

// Plugin represents an installed plugin and its runtime state.
type Plugin struct {
	Manifest
	Enabled     bool      `json:"enabled"`
	Dir         string    `json:"dir"`
	InstalledAt time.Time `json:"installedAt"`
	Builtin     bool      `json:"builtin"`
}

// ExecRequest represents a command execution request from a plugin.
type ExecRequest struct {
	PluginID  string   `json:"pluginId"`
	Command   string   `json:"command"`
	Args      []string `json:"args"`
	Cwd       string   `json:"cwd,omitempty"`
	Confirmed bool     `json:"confirmed,omitempty"`
}

// ExecResponse represents the output of a command execution.
type ExecResponse struct {
	ExitCode        int    `json:"exitCode"`
	Stdout          string `json:"stdout"`
	Stderr          string `json:"stderr"`
	DurationMs      int64  `json:"durationMs"`
	RequiresConfirm bool   `json:"requiresConfirm,omitempty"`
	Warning         string `json:"warning,omitempty"`
	Error           string `json:"error,omitempty"`
}

// ProcessInfo represents a running background process spawned by a plugin.
type ProcessInfo struct {
	ID        string    `json:"id"`
	PluginID  string    `json:"pluginId"`
	Command   string    `json:"command"`
	Args      []string  `json:"args"`
	Pid       int       `json:"pid"`
	Port      int       `json:"port,omitempty"`
	StartedAt time.Time `json:"startedAt"`
	Status    string    `json:"status"` // "running", "stopped", "failed"
}

// PendingInstall represents an inspected plugin awaiting user consent.
type PendingInstall struct {
	TempKey    string    `json:"tempKey"`
	Manifest   Manifest  `json:"manifest"`
	IsOfficial bool      `json:"isOfficial"`
	TempDir    string    `json:"-"`
	PluginDir  string    `json:"-"`
	CreatedAt  time.Time `json:"createdAt"`
}

