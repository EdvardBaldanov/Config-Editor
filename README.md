# Config Studio 🚀

Modern, lightweight web-based configuration editor designed for Linux systems with Monaco Editor, interactive AST structure map, customizable branding and colors.

![Mockup](https://raw.githubusercontent.com/user/config-studio/main/preview.png)

## ✨ Features

- **Monaco Editor Engine:** VS Code core editor with syntax highlighting for YAML, JSON, TOML, INI, Shell, Markdown, and Dockerfiles.
- **Interactive Structure Outline (AST Map):** Visual tree navigation of document hierarchy with data type badges (`Object`, `List`, `String`, `Boolean`, `Number`, `Section`). Clicking any key navigates directly to that line.
- **Dynamic Branding & Themes (via Web UI):**
  - Change application title dynamically — updates navbar and `<title>` tab name.
  - Upload custom icon/logo — updates favicon and navbar icon.
  - Real-time Base & Accent Color pickers (Material 3 palette).
  - Dark & Light mode toggle.
- **File Management inside `WORKDIR`:**
  - Tree navigation with directory sandboxing (prevents path traversal).
  - Drag-and-drop file upload zone.
  - Direct download button.
  - Inline file/folder creation, renaming, and deletion.
- **Single Binary Portability:**
  - Compiled with `CGO_ENABLED=0` into a standalone, zero-dependency binary.
  - Compatible with **Debian/Ubuntu** (glibc) and **Alpine Linux** (musl).
  - Service ready: includes both **systemd** service and **OpenRC** runscript.
  - Built-in HTTP Basic Auth support.

---

## 🛠️ Build & Install

```bash
# Clone or navigate to directory
cd /opt/config-studio

# Build frontend and binary
make build

# Install binary and systemd/OpenRC service
make install
```

---

## 🚀 Running

### Command line:
```bash
config-studio --port 8080 --workdir /etc/yaml-configs --auth-user admin --auth-pass secret
```

### Via systemd (Debian / Ubuntu):
```bash
systemctl enable --now config-studio
systemctl status config-studio
```

### Via OpenRC (Alpine Linux):
```bash
rc-update add config-studio default
rc-service config-studio start
```

---

## ⚙️ Configuration Flags & Environment Variables

| Flag | Env Variable | Default | Description |
|---|---|---|---|
| `--port` | `CONFIG_PORT` | `8080` | HTTP port to listen on |
| `--workdir` | `CONFIG_WORKDIR` | `./data/configs` | Root folder for managed config files |
| `--data` | `CONFIG_DATADIR` | `./data` | Directory for persistent settings and icons |
| `--auth-user` | `CONFIG_AUTH_USER` | `""` | Basic Auth username (disabled if empty) |
| `--auth-pass` | `CONFIG_AUTH_PASS` | `""` | Basic Auth password |
