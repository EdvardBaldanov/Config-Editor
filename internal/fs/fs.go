package fs

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type FileItem struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	IsDir     bool      `json:"isDir"`
	Size      int64     `json:"size"`
	ModTime   time.Time `json:"modTime"`
	CreatedAt time.Time `json:"createdAt"`
	Extension string    `json:"extension"`
}

type Service struct {
	WorkDir string
}

func NewService(workDir string) (*Service, error) {
	abs, err := filepath.Abs(workDir)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(abs, 0755); err != nil {
		return nil, err
	}
	return &Service{WorkDir: abs}, nil
}

func (s *Service) SafePath(rel string) (string, error) {
	rel = strings.TrimPrefix(rel, "/")
	clean := filepath.Clean(filepath.Join(s.WorkDir, rel))

	// Ensure the cleaned path is still inside WorkDir
	if clean != s.WorkDir && !strings.HasPrefix(clean, s.WorkDir+string(filepath.Separator)) {
		return "", errors.New("access denied: path is outside working directory")
	}
	return clean, nil
}

func (s *Service) ListDir(rel string) ([]FileItem, error) {
	fullPath, err := s.SafePath(rel)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	items := make([]FileItem, 0)
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		itemRel := filepath.Join(rel, entry.Name())
		// Normalize to forward slashes for web API
		itemRel = filepath.ToSlash(itemRel)

		modTime, createTime := GetFileTimes(info)

		items = append(items, FileItem{
			Name:      entry.Name(),
			Path:      itemRel,
			IsDir:     entry.IsDir(),
			Size:      info.Size(),
			ModTime:   modTime,
			CreatedAt: createTime,
			Extension: strings.ToLower(filepath.Ext(entry.Name())),
		})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].IsDir != items[j].IsDir {
			return items[i].IsDir // directories first
		}
		return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
	})

	return items, nil
}

func (s *Service) SearchFiles(query string) ([]FileItem, error) {
	items := make([]FileItem, 0)
	q := strings.ToLower(strings.TrimSpace(query))

	err := filepath.Walk(s.WorkDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if path == s.WorkDir {
			return nil
		}
		// Skip hidden directories (like .git, .cache)
		if info.IsDir() && strings.HasPrefix(info.Name(), ".") {
			return filepath.SkipDir
		}

		rel, err := filepath.Rel(s.WorkDir, path)
		if err != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)

		nameLower := strings.ToLower(info.Name())
		relLower := strings.ToLower(rel)

		if q == "" || strings.Contains(nameLower, q) || strings.Contains(relLower, q) {
			modTime, createTime := GetFileTimes(info)
			items = append(items, FileItem{
				Name:      info.Name(),
				Path:      rel,
				IsDir:     info.IsDir(),
				Size:      info.Size(),
				ModTime:   modTime,
				CreatedAt: createTime,
				Extension: strings.ToLower(filepath.Ext(info.Name())),
			})
		}

		if len(items) >= 200 {
			return filepath.SkipDir
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	if q != "" {
		sort.Slice(items, func(i, j int) bool {
			if items[i].IsDir != items[j].IsDir {
				return !items[i].IsDir
			}
			iName := strings.ToLower(items[i].Name)
			jName := strings.ToLower(items[j].Name)

			iExact := iName == q
			jExact := jName == q
			if iExact != jExact {
				return iExact
			}

			iPrefix := strings.HasPrefix(iName, q)
			jPrefix := strings.HasPrefix(jName, q)
			if iPrefix != jPrefix {
				return iPrefix
			}

			iContainsName := strings.Contains(iName, q)
			jContainsName := strings.Contains(jName, q)
			if iContainsName != jContainsName {
				return iContainsName
			}

			return iName < jName
		})
	} else {
		sort.Slice(items, func(i, j int) bool {
			if items[i].IsDir != items[j].IsDir {
				return !items[i].IsDir
			}
			return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
		})
	}

	if len(items) > 50 {
		items = items[:50]
	}

	return items, nil
}

func (s *Service) ReadFile(rel string) ([]byte, error) {
	fullPath, err := s.SafePath(rel)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(fullPath)
}

func (s *Service) WriteFile(rel string, content []byte, createBackup bool) error {
	fullPath, err := s.SafePath(rel)
	if err != nil {
		return err
	}

	// Create parent directories if they don't exist
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}

	if createBackup {
		if _, err := os.Stat(fullPath); err == nil {
			bakPath := fullPath + ".bak"
			_ = copyFile(fullPath, bakPath)
		}
	}

	return os.WriteFile(fullPath, content, 0644)
}

func (s *Service) CreateItem(rel string, isDir bool) error {
	fullPath, err := s.SafePath(rel)
	if err != nil {
		return err
	}

	if isDir {
		return os.MkdirAll(fullPath, 0755)
	}

	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}

	f, err := os.OpenFile(fullPath, os.O_RDWR|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return err
	}
	return f.Close()
}

func (s *Service) DeleteItem(rel string) error {
	fullPath, err := s.SafePath(rel)
	if err != nil {
		return err
	}
	if fullPath == s.WorkDir {
		return errors.New("cannot delete root working directory")
	}
	return os.RemoveAll(fullPath)
}

func (s *Service) RenameItem(oldRel, newRel string) error {
	oldPath, err := s.SafePath(oldRel)
	if err != nil {
		return err
	}
	newPath, err := s.SafePath(newRel)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(newPath), 0755); err != nil {
		return err
	}
	return os.Rename(oldPath, newPath)
}

func (s *Service) UploadFile(dirRel, filename string, r io.Reader) (string, error) {
	dirPath, err := s.SafePath(dirRel)
	if err != nil {
		return "", err
	}

	safeName := filepath.Base(filename)
	if safeName == "." || safeName == "/" || safeName == "" {
		return "", fmt.Errorf("invalid filename: %s", filename)
	}

	targetPath := filepath.Join(dirPath, safeName)
	dst, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, r); err != nil {
		return "", err
	}

	return filepath.ToSlash(filepath.Join(dirRel, safeName)), nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
