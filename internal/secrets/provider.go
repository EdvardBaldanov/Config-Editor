package secrets

// Provider represents a key-value secrets storage backend.
type Provider interface {
	Get(key string) (string, error)
	Set(key, value string) error
	Delete(key string) error
	Name() string
}
