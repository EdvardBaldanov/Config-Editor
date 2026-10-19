package plugin

import (
	"strconv"
	"strings"
)

// SemVer represents a semantic version (major.minor.patch).
type SemVer struct {
	Major int
	Minor int
	Patch int
}

// ParseSemVer parses a version string into a SemVer struct.
func ParseSemVer(v string) (SemVer, bool) {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "v")
	v = strings.TrimPrefix(v, "V")
	if v == "" {
		return SemVer{}, false
	}
	parts := strings.Split(v, ".")
	var sv SemVer
	var err error
	if len(parts) >= 1 {
		mainPart := strings.Split(parts[0], "-")[0]
		mainPart = strings.Split(mainPart, "+")[0]
		sv.Major, err = strconv.Atoi(mainPart)
		if err != nil {
			return SemVer{}, false
		}
	}
	if len(parts) >= 2 {
		mainPart := strings.Split(parts[1], "-")[0]
		mainPart = strings.Split(mainPart, "+")[0]
		sv.Minor, err = strconv.Atoi(mainPart)
		if err != nil {
			return SemVer{}, false
		}
	}
	if len(parts) >= 3 {
		mainPart := strings.Split(parts[2], "-")[0]
		mainPart = strings.Split(mainPart, "+")[0]
		sv.Patch, err = strconv.Atoi(mainPart)
		if err != nil {
			return SemVer{}, false
		}
	}
	return sv, true
}

// Compare returns:
//  -1 if v < o
//   0 if v == o
//   1 if v > o
func (v SemVer) Compare(o SemVer) int {
	if v.Major != o.Major {
		if v.Major > o.Major {
			return 1
		}
		return -1
	}
	if v.Minor != o.Minor {
		if v.Minor > o.Minor {
			return 1
		}
		return -1
	}
	if v.Patch != o.Patch {
		if v.Patch > o.Patch {
			return 1
		}
		return -1
	}
	return 0
}

// MatchesVersionConstraint checks whether installedVersion matches the constraint.
// Empty constraint, "*", or "latest" matches any installed version.
func MatchesVersionConstraint(installedVersion, constraint string) bool {
	constraint = strings.TrimSpace(constraint)
	if constraint == "" || constraint == "*" || strings.EqualFold(constraint, "latest") {
		return true
	}

	inst, ok := ParseSemVer(installedVersion)
	if !ok {
		return false
	}

	switch {
	case strings.HasPrefix(constraint, ">="):
		req, ok := ParseSemVer(strings.TrimSpace(strings.TrimPrefix(constraint, ">=")))
		return ok && inst.Compare(req) >= 0
	case strings.HasPrefix(constraint, "<="):
		req, ok := ParseSemVer(strings.TrimSpace(strings.TrimPrefix(constraint, "<=")))
		return ok && inst.Compare(req) <= 0
	case strings.HasPrefix(constraint, ">"):
		req, ok := ParseSemVer(strings.TrimSpace(strings.TrimPrefix(constraint, ">")))
		return ok && inst.Compare(req) > 0
	case strings.HasPrefix(constraint, "<"):
		req, ok := ParseSemVer(strings.TrimSpace(strings.TrimPrefix(constraint, "<")))
		return ok && inst.Compare(req) < 0
	case strings.HasPrefix(constraint, "^"):
		req, ok := ParseSemVer(strings.TrimSpace(strings.TrimPrefix(constraint, "^")))
		if !ok || inst.Compare(req) < 0 {
			return false
		}
		if req.Major > 0 {
			return inst.Major == req.Major
		}
		if req.Minor > 0 {
			return inst.Major == 0 && inst.Minor == req.Minor
		}
		return inst.Major == 0 && inst.Minor == 0 && inst.Patch == req.Patch
	case strings.HasPrefix(constraint, "~"):
		req, ok := ParseSemVer(strings.TrimSpace(strings.TrimPrefix(constraint, "~")))
		if !ok || inst.Compare(req) < 0 {
			return false
		}
		return inst.Major == req.Major && inst.Minor == req.Minor
	case strings.HasPrefix(constraint, "="):
		req, ok := ParseSemVer(strings.TrimSpace(strings.TrimPrefix(constraint, "=")))
		return ok && inst.Compare(req) == 0
	default:
		req, ok := ParseSemVer(constraint)
		return ok && inst.Compare(req) == 0
	}
}
