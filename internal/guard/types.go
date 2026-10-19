package guard

type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityWarning  Severity = "warning"
	SeverityInfo     Severity = "info"
)

// GuardIssue represents a syntax or compatibility issue found in a configuration file.
type GuardIssue struct {
	File     string   `json:"file"`
	Severity Severity `json:"severity"` // "critical" | "warning"
	Line     int      `json:"line"`
	Column   int      `json:"column"`
	Message  string   `json:"message"`
	Snippet  string   `json:"snippet,omitempty"`
	Rule     string   `json:"rule"`
}

// ValidationResult represents the full outcome of a structure check.
type ValidationResult struct {
	Valid     bool         `json:"valid"`
	IsGuarded bool         `json:"isGuarded"`
	Issues    []GuardIssue `json:"issues"`
}
