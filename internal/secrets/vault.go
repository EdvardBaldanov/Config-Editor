package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
)

type EncryptedVaultProvider struct {
	filePath string
	key      []byte
	mu       sync.RWMutex
}

func NewEncryptedVaultProvider(dataDir string) (*EncryptedVaultProvider, error) {
	vaultPath := filepath.Join(dataDir, ".secrets.enc")

	// Derive machine-specific key
	hostname, _ := os.Hostname()
	salt := "ConfigStudio:SecretVault:v1:2026"
	hash := sha256.Sum256([]byte(hostname + ":" + dataDir + ":" + salt))

	return &EncryptedVaultProvider{
		filePath: vaultPath,
		key:      hash[:],
	}, nil
}

func (p *EncryptedVaultProvider) Name() string {
	return "Encrypted Vault (AES-256-GCM)"
}

func (p *EncryptedVaultProvider) readMap() (map[string]string, error) {
	data, err := os.ReadFile(p.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return make(map[string]string), nil
		}
		return nil, err
	}

	block, err := aes.NewCipher(p.key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, fmt.Errorf("vault data too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("vault decryption failed: %w", err)
	}

	var res map[string]string
	if err := json.Unmarshal(plaintext, &res); err != nil {
		return nil, err
	}

	return res, nil
}

func (p *EncryptedVaultProvider) writeMap(m map[string]string) error {
	raw, err := json.Marshal(m)
	if err != nil {
		return err
	}

	block, err := aes.NewCipher(p.key)
	if err != nil {
		return err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return err
	}

	ciphertext := gcm.Seal(nonce, nonce, raw, nil)
	return os.WriteFile(p.filePath, ciphertext, 0600)
}

func (p *EncryptedVaultProvider) Get(key string) (string, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	m, err := p.readMap()
	if err != nil {
		return "", err
	}

	val, ok := m[key]
	if !ok {
		return "", fmt.Errorf("secret not found: %s", key)
	}
	return val, nil
}

func (p *EncryptedVaultProvider) Set(key, value string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	m, err := p.readMap()
	if err != nil {
		m = make(map[string]string)
	}

	m[key] = value
	return p.writeMap(m)
}

func (p *EncryptedVaultProvider) Delete(key string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	m, err := p.readMap()
	if err != nil {
		return nil
	}

	delete(m, key)
	return p.writeMap(m)
}
