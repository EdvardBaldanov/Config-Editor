package main

import (
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

const (
	targetBinaryPath  = "/usr/local/bin/config-studio"
	optDir            = "/opt/config-studio"
	dataDirDefault    = "/opt/config-studio/data"
	configsDirDefault = "/opt/config-studio/data/configs"
	envFilePath       = "/opt/config-studio/config.env"
	systemdUnitPath   = "/etc/systemd/system/config-studio.service"
	openrcScriptPath  = "/etc/init.d/config-studio"
)

func detectInitSystem() string {
	// Check for systemd first (/run/systemd/system is created when systemd is PID 1)
	if _, err := os.Stat("/run/systemd/system"); err == nil {
		return "systemd"
	}
	if p, err := exec.LookPath("systemctl"); err == nil && p != "" {
		return "systemd"
	}

	// Check for OpenRC
	if _, err := os.Stat("/run/openrc"); err == nil {
		return "openrc"
	}
	if p, err := exec.LookPath("rc-service"); err == nil && p != "" {
		return "openrc"
	}
	if _, err := os.Stat("/sbin/openrc-run"); err == nil {
		return "openrc"
	}

	return "unknown"
}

func handleInstall() {
	if runtime.GOOS == "windows" {
		log.Fatalf("Service installation (-install) is designed for Linux systemd and OpenRC systems.")
	}
	if os.Geteuid() != 0 {
		log.Fatalf("Error: root privileges required to install system service. Please run with sudo: sudo %s -install", os.Args[0])
	}

	initSys := detectInitSystem()
	if initSys == "unknown" {
		log.Fatalf("Error: could not detect systemd or OpenRC on this system.")
	}

	fmt.Printf("--> Detected init system: %s\n", initSys)

	// 1. Locate current binary and copy to /usr/local/bin/config-studio
	selfPath, err := os.Executable()
	if err != nil {
		log.Fatalf("Failed to resolve current binary path: %v", err)
	}
	selfPath, _ = filepath.EvalSymlinks(selfPath)

	if err := os.MkdirAll("/usr/local/bin", 0755); err != nil {
		log.Fatalf("Failed to create /usr/local/bin: %v", err)
	}

	if selfPath != targetBinaryPath {
		fmt.Printf("--> Installing binary to %s...\n", targetBinaryPath)
		if err := copyBinary(selfPath, targetBinaryPath); err != nil {
			log.Fatalf("Failed to copy binary: %v", err)
		}
	} else {
		fmt.Printf("--> Binary is already located at %s\n", targetBinaryPath)
	}

	// 2. Prepare directories in /opt/config-studio
	fmt.Printf("--> Creating workspace directories in %s...\n", optDir)
	_ = os.MkdirAll(configsDirDefault, 0755)
	_ = os.MkdirAll(dataDirDefault, 0755)

	// 3. Write default config.env if not present
	if _, err := os.Stat(envFilePath); os.IsNotExist(err) {
		defaultEnv := `# Config Studio environment variables
CONFIG_PORT=8080
CONFIG_WORKDIR=/opt/config-studio/data/configs
CONFIG_DATADIR=/opt/config-studio/data
# Basic Auth (optional)
# CONFIG_AUTH_USER=admin
# CONFIG_AUTH_PASS=changeme
`
		if err := os.WriteFile(envFilePath, []byte(defaultEnv), 0644); err != nil {
			log.Printf("Warning: failed to write %s: %v", envFilePath, err)
		} else {
			fmt.Printf("--> Created default environment configuration: %s\n", envFilePath)
		}
	}

	// 4. Configure service based on init system
	if initSys == "systemd" {
		unitContent := `[Unit]
Description=Config Studio Web Editor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/config-studio
EnvironmentFile=-/opt/config-studio/config.env
ExecStart=/usr/local/bin/config-studio
Restart=always
RestartSec=3s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
`
		fmt.Printf("--> Writing systemd unit to %s...\n", systemdUnitPath)
		if err := os.WriteFile(systemdUnitPath, []byte(unitContent), 0644); err != nil {
			log.Fatalf("Failed to write systemd unit file: %v", err)
		}

		fmt.Println("--> Reloading systemd and enabling service...")
		_ = runCmd("systemctl", "daemon-reload")
		_ = runCmd("systemctl", "enable", "config-studio.service")

		fmt.Println("--> Starting Config Studio service...")
		if err := runCmd("systemctl", "restart", "config-studio.service"); err != nil {
			log.Printf("Warning: systemctl restart failed: %v", err)
		}

		fmt.Println("\n========================================================")
		fmt.Println(" Config Studio has been successfully installed!")
		fmt.Println(" Init system:  systemd")
		fmt.Printf(" Binary:       %s\n", targetBinaryPath)
		fmt.Printf(" Service:      %s\n", systemdUnitPath)
		fmt.Printf(" Configs:      %s\n", configsDirDefault)
		fmt.Println(" Web UI:       http://<server-ip>:8080")
		fmt.Println(" Commands:")
		fmt.Println("   systemctl status config-studio")
		fmt.Println("   systemctl restart config-studio")
		fmt.Println("   systemctl stop config-studio")
		fmt.Println("========================================================")

	} else if initSys == "openrc" {
		openrcContent := `#!/sbin/openrc-run

name="config-studio"
description="Config Studio Web Editor"
command="/usr/local/bin/config-studio"
command_background="yes"
pidfile="/run/config-studio.pid"
directory="/opt/config-studio"

depend() {
	need net
	after firewall
}

start_pre() {
	if [ -f /opt/config-studio/config.env ]; then
		set -a
		. /opt/config-studio/config.env
		set +a
	fi
}
`
		fmt.Printf("--> Writing OpenRC service script to %s...\n", openrcScriptPath)
		if err := os.WriteFile(openrcScriptPath, []byte(openrcContent), 0755); err != nil {
			log.Fatalf("Failed to write OpenRC service script: %v", err)
		}

		fmt.Println("--> Adding service to default runlevel...")
		_ = runCmd("rc-update", "add", "config-studio", "default")

		fmt.Println("--> Starting Config Studio service...")
		if err := runCmd("rc-service", "config-studio", "restart"); err != nil {
			log.Printf("Warning: rc-service restart failed: %v", err)
		}

		fmt.Println("\n========================================================")
		fmt.Println(" Config Studio has been successfully installed!")
		fmt.Println(" Init system:  OpenRC")
		fmt.Printf(" Binary:       %s\n", targetBinaryPath)
		fmt.Printf(" Service:      %s\n", openrcScriptPath)
		fmt.Printf(" Configs:      %s\n", configsDirDefault)
		fmt.Println(" Web UI:       http://<server-ip>:8080")
		fmt.Println(" Commands:")
		fmt.Println("   rc-service config-studio status")
		fmt.Println("   rc-service config-studio restart")
		fmt.Println("   rc-service config-studio stop")
		fmt.Println("========================================================")
	}
}

func handleUninstall() {
	if runtime.GOOS == "windows" {
		log.Fatalf("Service uninstallation (-uninstall) is designed for Linux systemd and OpenRC systems.")
	}
	if os.Geteuid() != 0 {
		log.Fatalf("Error: root privileges required to uninstall system service. Please run with sudo: sudo %s -uninstall", os.Args[0])
	}

	initSys := detectInitSystem()
	fmt.Printf("--> Detected init system: %s\n", initSys)

	if initSys == "systemd" {
		fmt.Println("--> Stopping and disabling systemd service...")
		_ = runCmd("systemctl", "stop", "config-studio.service")
		_ = runCmd("systemctl", "disable", "config-studio.service")
		if err := os.Remove(systemdUnitPath); err != nil && !os.IsNotExist(err) {
			log.Printf("Warning: could not remove %s: %v", systemdUnitPath, err)
		} else {
			fmt.Printf("--> Removed %s\n", systemdUnitPath)
		}
		_ = runCmd("systemctl", "daemon-reload")
		_ = runCmd("systemctl", "reset-failed")
	} else if initSys == "openrc" {
		fmt.Println("--> Stopping and removing OpenRC service...")
		_ = runCmd("rc-service", "config-studio", "stop")
		_ = runCmd("rc-update", "del", "config-studio", "default")
		if err := os.Remove(openrcScriptPath); err != nil && !os.IsNotExist(err) {
			log.Printf("Warning: could not remove %s: %v", openrcScriptPath, err)
		} else {
			fmt.Printf("--> Removed %s\n", openrcScriptPath)
		}
	}

	// Remove binary from /usr/local/bin/config-studio
	if err := os.Remove(targetBinaryPath); err != nil && !os.IsNotExist(err) {
		log.Printf("Warning: could not remove %s: %v", targetBinaryPath, err)
	} else {
		fmt.Printf("--> Removed binary %s\n", targetBinaryPath)
	}

	fmt.Println("\n========================================================")
	fmt.Println(" Config Studio service and binary uninstalled successfully.")
	fmt.Printf(" Note: Your configuration files in %s were preserved.\n", optDir)
	fmt.Println(" If you wish to completely remove all data, run:")
	fmt.Printf("   rm -rf %s\n", optDir)
	fmt.Println("========================================================")
}

func copyBinary(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	tmpDst := dst + ".tmp"
	out, err := os.OpenFile(tmpDst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		return err
	}

	if _, err = io.Copy(out, in); err != nil {
		out.Close()
		_ = os.Remove(tmpDst)
		return err
	}
	out.Close()

	return os.Rename(tmpDst, dst)
}

func runCmd(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
