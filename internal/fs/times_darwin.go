//go:build darwin

package fs

import (
	"os"
	"syscall"
	"time"
)

// GetFileTimes returns the modification time and creation/status change time of a file on Darwin/macOS
func GetFileTimes(info os.FileInfo) (modTime time.Time, createTime time.Time) {
	modTime = info.ModTime()
	createTime = modTime
	if sys, ok := info.Sys().(*syscall.Stat_t); ok && sys != nil {
		createTime = time.Unix(int64(sys.Ctimespec.Sec), int64(sys.Ctimespec.Nsec))
	}
	return modTime, createTime
}
