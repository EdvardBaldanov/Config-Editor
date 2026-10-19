//go:build !windows

package secrets

func NewSystemProvider(fallback Provider) Provider {
	return fallback
}
