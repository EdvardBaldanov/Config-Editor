package plugin

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var (
	ErrCommandBlacklisted = errors.New("command is strictly prohibited for security reasons")
	ErrConfirmationNeeded = errors.New("command requires explicit user confirmation")
)

// Blacklisted command patterns that are never permitted under any circumstances
var blacklistedPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\brm\s+-[rf]{1,3}\s+(/\*?|[a-z]:\\*)(\s|$)`),
	regexp.MustCompile(`(?i)\bmkfs\b`),
	regexp.MustCompile(`(?i)\bdd\s+if=.*of=(/dev/|[a-z]:)`),
	regexp.MustCompile(`(?i)\b(fdisk|parted|gdisk)\b`),
	regexp.MustCompile(`(?i):\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:`), // fork bomb
	regexp.MustCompile(`(?i)\b(shutdown|reboot|poweroff|halt)\b`),
	regexp.MustCompile(`(?i)\binit\s+[06]\b`),
	regexp.MustCompile(`(?i)\bdel\s+/[fqs]+\s+[a-z]:\\*`),
	regexp.MustCompile(`(?i)\bformat\s+[a-z]:`),
}

// Potentially risky patterns requiring user confirmation unless "I know what I'm doing" is active
var riskyPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(apt|apt-get|yum|dnf|pacman|apk)\s+(install|remove|purge)`),
	regexp.MustCompile(`(?i)\b(curl|wget).*\|\s*(sh|bash|zsh|powershell|cmd)\b`),
	regexp.MustCompile(`(?i)\bchmod\s+-[rR]\s+777\b`),
	regexp.MustCompile(`(?i)\bchown\s+-[rR]\b`),
	regexp.MustCompile(`(?i)\b(systemctl|service)\s+(stop|disable|mask)\b`),
	regexp.MustCompile(`(?i)\bdocker\s+system\s+prune\b`),
	regexp.MustCompile(`(?i)\brm\s+-[rf]{1,3}\b`),
}

// ValidateCommand checks if a command is safe, risky, or forbidden.
func ValidateCommand(command string, args []string, unrestricted bool, confirmed bool) error {
	fullCmd := strings.TrimSpace(command + " " + strings.Join(args, " "))

	// 1. Strict Blacklist Check (Cannot be bypassed)
	for _, pattern := range blacklistedPatterns {
		if pattern.MatchString(fullCmd) {
			return fmt.Errorf("%w: matched dangerous pattern %q", ErrCommandBlacklisted, pattern.String())
		}
	}

	// If user is in unrestricted mode ("I know what I'm doing") or has already confirmed this execution:
	if unrestricted || confirmed {
		return nil
	}

	// 2. Check if command matches risky patterns requiring confirmation
	for _, pattern := range riskyPatterns {
		if pattern.MatchString(fullCmd) {
			return fmt.Errorf("%w: action %q is considered high-risk and needs confirmation", ErrConfirmationNeeded, command)
		}
	}

	return nil
}
