package audit

import "time"

// Severity levels for audit events
const (
	SeverityInfo     = "info"
	SeverityWarn     = "warn"
	SeverityError    = "error"
	SeverityCritical = "critical"
)

// Categories for structured observability
const (
	CategoryUser    = "user"
	CategorySystem  = "system"
	CategoryError   = "error"
	CategoryPlugin  = "plugin"
	CategoryNetwork = "network"
)

// Common action constants
const (
	ActionFileSave       = "file.save"
	ActionFileForceSave  = "file.forcesave"
	ActionFileDelete     = "file.delete"
	ActionFileRename     = "file.rename"
	ActionFileCreate     = "file.create"
	ActionShellExec      = "shell.exec"
	ActionPluginInstall  = "plugin.install"
	ActionPluginToggle   = "plugin.toggle"
	ActionPluginDelete   = "plugin.delete"
	ActionPluginLoad     = "plugin.load"
	ActionPluginError    = "plugin.error"
	ActionServerDeploy   = "server.deploy"
	ActionServiceRestart = "service.restart"
	ActionNetDownload    = "net.download"
	ActionNetError       = "net.error"
	ActionSystemStart    = "system.start"
	ActionSystemError    = "system.error"
	ActionUIError        = "ui.error"
)

// Event represents an individual audit log entry.
type Event struct {
	ID        string         `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	Source    string         `json:"source,omitempty"`   // "frontend", "backend", "plugin"
	SourceID  string         `json:"sourceId,omitempty"` // "core", "remote-agent", etc.
	Category  string         `json:"category,omitempty"` // "user", "system", "error", "plugin", "network"
	User      string         `json:"user"`
	IP        string         `json:"ip"`
	Action    string         `json:"action"`
	Severity  string         `json:"severity"` // "info", "warn", "error", "critical"
	Target    string         `json:"target"`   // e.g. "/etc/nginx/nginx.conf", "config-studio-docker"
	Details   map[string]any `json:"details,omitempty"`
}

// QueryFilter defines filtering criteria for retrieving audit logs.
type QueryFilter struct {
	Limit    int       `json:"limit"`
	Offset   int       `json:"offset"`
	Action   string    `json:"action,omitempty"`
	Category string    `json:"category,omitempty"`
	Source   string    `json:"source,omitempty"`
	Severity string    `json:"severity,omitempty"`
	Search   string    `json:"search,omitempty"`
	From     time.Time `json:"from,omitempty"`
	To       time.Time `json:"to,omitempty"`
}

// QueryResult represents the response for a query.
type QueryResult struct {
	Events []Event `json:"events"`
	Total  int     `json:"total"`
}
