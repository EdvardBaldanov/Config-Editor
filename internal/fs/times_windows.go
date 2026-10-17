//go:build windows

package fs

import (
	"os"
	"syscall"
	"time"
)

// GetFileTimes returns the modification time and creation (birth) time of a file on Windows
func GetFileTimes(info os.FileInfo) (modTime time.Time, createTime time.Time) {
	modTime = info.ModTime()
	createTime = modTime
	if sys, ok := info.Sys().(*syscall.Win32FileAttributeData); ok && sys != nil {
		createTime = time.Unix(0, sys.CreationTime.Nanoseconds())
	}
	return modTime, createTime
}
