# Config Editor 🚀

Modern, lightweight web-based configuration editor with **Monaco Editor**, interactive **AST structure map**, draggable resizable panels, and customizable branding. Single standalone binary for **Linux** and **Windows** with zero external runtime dependencies.

[![Build & Release](https://github.com/EdvardBaldanov/Config-Editor/actions/workflows/build.yml/badge.svg)](https://github.com/EdvardBaldanov/Config-Editor/actions/workflows/build.yml)

---

## ✨ Features

- **Monaco Editor Engine:** VS Code core editor with syntax highlighting for YAML, JSON, TOML, INI, Shell, Markdown, and Dockerfiles.
- **Interactive Structure Outline (AST Map):** 
  - Visual hierarchical tree navigation with data type badges (`Object`, `List`, `String`, `Boolean`, `Number`, `Section`).
  - Search within structure outline with match counter (`X of Y`) and navigation arrows.
  - Expand/collapse all outline sections.
  - Quick jump tag cloud for rapid section switching.
  - **Draggable resizable panel width** (with double-click reset to default 320px).
- **Multi-Tab File Management:**
  - Tabbed editing interface with unsaved changes indicators.
  - Quick File Switcher / Search (`Ctrl+P`).
  - File properties modal with live SHA-256 hash calculation and clipboard copy.
  - Session edit history with diff preview and one-click revision restore.
- **Dynamic Branding & Themes (via Web UI):**
  - Change application title dynamically — updates navbar and `<title>` tab name.
  - Upload custom icon/logo (.svg, .png, .ico, .webp) — updates favicon and navbar icon.
  - Real-time Base & Accent Color pickers with light/dark luminance auto-contrast.
  - Multi-language interface support (**Русский** / **English**).
- **Security & Access Control:**
  - Direct password authentication option (Login screen).
  - Reverse proxy SSO compatibility (Authentik, Authelia via headers).
  - Disableable REST API with secret `X-API-Key` generation.
- **Single Binary Portability:**
  - Embedded frontend assets (`go:embed`). Zero runtime dependencies!
  - Automated CI/CD builds for **Linux (amd64, arm64)** and **Windows (amd64)**.
  - Self-installing service flags (`-install` / `-uninstall`) with auto-detection for **systemd** and **OpenRC**.

---

## 🚀 Quick Start

### Download Pre-built Binary
Download the latest binary for your operating system from the **[GitHub Releases / Actions Artifacts](https://github.com/EdvardBaldanov/Config-Editor/releases)** page:
- **Linux (amd64)**: `config-editor-linux-amd64`
- **Linux (arm64)**: `config-editor-linux-arm64`
- **Windows (amd64)**: `config-editor-windows-amd64.exe`

### Running on Linux
```bash
# Make binary executable and run
chmod +x config-editor-linux-amd64
./config-editor-linux-amd64 --port 8080 --workdir /etc/yaml-configs
```

### Self-Installation as a System Service (Linux)
The binary can automatically install itself as a systemd or OpenRC service:
```bash
# Auto-detects systemd or OpenRC and sets up service
sudo ./config-editor-linux-amd64 -install

# To uninstall service:
sudo ./config-editor-linux-amd64 -uninstall
```

### Running on Windows
```powershell
.\config-editor-windows-amd64.exe -port 8080 -workdir C:\configs
```
Then open your browser at `http://localhost:8080`.

---

## 🛠️ Building from Source

### Prerequisites
- **Go 1.22+**
- **Node.js 20+** & **npm**

### Build Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/EdvardBaldanov/Config-Editor.git
   cd Config-Editor
   ```

2. **Build Web Frontend:**
   ```bash
   cd web
   npm install
   npm run build
   cd ..
   ```

3. **Compile Go Binary:**
   - **For Linux:**
     ```bash
     CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/config-editor ./cmd/server
     ```
   - **For Windows:**
     ```powershell
     go build -ldflags="-s -w" -o bin/config-editor.exe ./cmd/server
     ```

---

## ⚙️ Configuration Flags & Environment Variables

| Flag | Env Variable | Default | Description |
|---|---|---|---|
| `--port` | `CONFIG_PORT` | `8080` | HTTP port to listen on |
| `--workdir` | `CONFIG_WORKDIR` | `./data/configs` | Root directory for managed config files |
| `--data` | `CONFIG_DATADIR` | `./data` | Directory for persistent settings, history & icons |
| `--auth-user` | `CONFIG_AUTH_USER` | `""` | Basic Auth username (disabled if empty) |
| `--auth-pass` | `CONFIG_AUTH_PASS` | `""` | Basic Auth password |
| `-install` | — | `false` | Install as systemd/OpenRC service (Linux) |
| `-uninstall` | — | `false` | Uninstall systemd/OpenRC service (Linux) |

---

## 📄 License
MIT License.
