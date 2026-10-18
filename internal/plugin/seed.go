package plugin

import (
	"os"
	"path/filepath"
)

// seedDefaultPlugins creates the flagship default plugins if they don't already exist.
func (m *Manager) seedDefaultPlugins() {
	m.seedWebDevKit()
	m.seedRemoteAgent()
}

func (m *Manager) seedWebDevKit() {
	dir := filepath.Join(m.pluginsDir, "web-devkit")
	if _, err := os.Stat(filepath.Join(dir, "plugin.json")); err == nil {
		return // already exists
	}

	_ = os.MkdirAll(dir, 0755)

	manifest := `{
  "id": "web-devkit",
  "name": "Web DevKit",
  "version": "1.0.0",
  "description": "HTML & PHP Live Preview, Embedded Server & Web DevTools",
  "author": "Config Studio Team",
  "icon": "globe",
  "entry": "main.js",
  "css": "style.css",
  "permissions": ["ui.panels", "terminal.exec", "network.bind"],
  "fileMatches": [".html", ".htm", ".php", ".phtml", ".css", ".js"]
}
`
	_ = os.WriteFile(filepath.Join(dir, "plugin.json"), []byte(manifest), 0644)

	mainJS := `/**
 * Web DevKit Plugin for Config Studio
 * Provides Live HTML/PHP Preview, device frame simulation, and host server integration.
 */
(function() {
  const pluginId = 'web-devkit';
  if (!window.ConfigStudio) {
    console.warn('[WebDevKit] ConfigStudio API not found.');
    return;
  }

  let previewActive = false;
  let serverProcess = null;
  let serverPort = 8085;
  let deviceMode = 'responsive'; // 'responsive', 'desktop', 'tablet', 'mobile'

  const isWebFile = (path) => {
    if (!path) return false;
    const lower = path.toLowerCase();
    return lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.php') || lower.endsWith('.phtml');
  };

  // Register Header Toolbar Button
  window.ConfigStudio.registerToolbarButton({
    id: 'web-devkit-preview-btn',
    pluginId: pluginId,
    label: 'Live Preview',
    title: 'Открыть живой предпросмотр (Live Preview)',
    icon: 'play',
    visible: () => {
      const file = window.ConfigStudio.getActiveFile();
      return file && isWebFile(file.path);
    },
    onClick: () => {
      togglePreview();
    }
  });

  function togglePreview() {
    previewActive = !previewActive;
    window.ConfigStudio.toggleSplitPanel({
      id: 'web-devkit-preview-panel',
      pluginId: pluginId,
      title: 'Web DevKit — Предпросмотр',
      open: previewActive,
      render: (container) => renderPreviewUI(container)
    });
  }

  function renderPreviewUI(container) {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'web-devkit-container flex flex-col h-full w-full bg-base-surface text-xs select-none';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'web-devkit-toolbar flex items-center justify-between px-3 py-2 border-b border-base-border bg-base gap-2';

    const leftControls = document.createElement('div');
    leftControls.className = 'flex items-center gap-1.5';

    // Device switcher buttons
    const createDeviceBtn = (mode, label, icon) => {
      const btn = document.createElement('button');
      btn.className = 'px-2 py-1 rounded text-xs transition font-medium ' + 
        (deviceMode === mode ? 'bg-accent text-gray-900 font-semibold' : 'hover:bg-base-surface-hover text-gray-400');
      btn.textContent = label;
      btn.onclick = () => {
        deviceMode = mode;
        updateFrameSize();
        renderPreviewUI(container);
      };
      return btn;
    };

    leftControls.appendChild(createDeviceBtn('responsive', 'Full', '📱'));
    leftControls.appendChild(createDeviceBtn('desktop', '1280px', '💻'));
    leftControls.appendChild(createDeviceBtn('tablet', '768px', '📟'));
    leftControls.appendChild(createDeviceBtn('mobile', '375px', '📱'));

    // Server Controls
    const rightControls = document.createElement('div');
    rightControls.className = 'flex items-center gap-2';

    const serverBtn = document.createElement('button');
    serverBtn.className = 'px-2.5 py-1 rounded text-xs transition font-medium flex items-center gap-1 ' +
      (serverProcess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-base-surface-hover hover:bg-base-border text-gray-300');
    serverBtn.innerHTML = serverProcess ? '🟢 Сервер :8085' : '▶ Запустить PHP/Web сервер';
    serverBtn.onclick = async () => {
      if (serverProcess) {
        await stopServer();
      } else {
        await startServer();
      }
      renderPreviewUI(container);
    };
    rightControls.appendChild(serverBtn);

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'p-1 hover:bg-base-surface-hover rounded text-gray-300 hover:text-white transition';
    refreshBtn.title = 'Обновить';
    refreshBtn.innerHTML = '🔄';
    refreshBtn.onclick = () => refreshPreview();
    rightControls.appendChild(refreshBtn);

    toolbar.appendChild(leftControls);
    toolbar.appendChild(rightControls);
    wrapper.appendChild(toolbar);

    // Frame area
    const frameContainer = document.createElement('div');
    frameContainer.className = 'flex-1 overflow-auto flex items-center justify-center p-2 bg-black/40';

    const iframe = document.createElement('iframe');
    iframe.id = 'web-devkit-frame';
    iframe.className = 'h-full bg-white transition-all duration-200 rounded shadow-lg border border-base-border';
    iframe.sandbox = 'allow-scripts allow-forms allow-same-origin allow-modals';
    
    // Set width according to deviceMode
    if (deviceMode === 'desktop') iframe.style.width = '1280px';
    else if (deviceMode === 'tablet') iframe.style.width = '768px';
    else if (deviceMode === 'mobile') iframe.style.width = '375px';
    else iframe.style.width = '100%';

    frameContainer.appendChild(iframe);
    wrapper.appendChild(frameContainer);
    container.appendChild(wrapper);

    loadIframeContent(iframe);
  }

  function updateFrameSize() {
    const iframe = document.getElementById('web-devkit-frame');
    if (!iframe) return;
    if (deviceMode === 'desktop') iframe.style.width = '1280px';
    else if (deviceMode === 'tablet') iframe.style.width = '768px';
    else if (deviceMode === 'mobile') iframe.style.width = '375px';
    else iframe.style.width = '100%';
  }

  function loadIframeContent(iframe) {
    const file = window.ConfigStudio.getActiveFile();
    if (!file) return;

    if (serverProcess) {
      // Load through live web server
      const filename = file.name;
      iframe.src = 'http://' + window.location.hostname + ':' + serverPort + '/' + filename;
    } else {
      // Direct HTML blob preview
      const content = file.content;
      iframe.srcdoc = content;
    }
  }

  function refreshPreview() {
    const iframe = document.getElementById('web-devkit-frame');
    if (iframe) {
      loadIframeContent(iframe);
    }
  }

  async function startServer() {
    try {
      window.ConfigStudio.showNotification('Запуск PHP/Web сервера на порту 8085...', 'info');
      // Attempt php -S first, with fallback to python -m http.server
      const proc = await window.ConfigStudio.startProcess({
        pluginId: pluginId,
        command: 'php',
        args: ['-S', '0.0.0.0:' + serverPort],
        port: serverPort
      });
      serverProcess = proc;
      window.ConfigStudio.showNotification('Сервер успешно запущен на порту ' + serverPort, 'success');
      refreshPreview();
    } catch (err) {
      console.warn('php server failed, trying python:', err);
      try {
        const proc = await window.ConfigStudio.startProcess({
          pluginId: pluginId,
          command: 'python3',
          args: ['-m', 'http.server', String(serverPort)],
          port: serverPort
        });
        serverProcess = proc;
        window.ConfigStudio.showNotification('Сервер Python запущен на порту ' + serverPort, 'success');
        refreshPreview();
      } catch (err2) {
        window.ConfigStudio.showNotification('Не удалось запустить сервер: ' + (err.message || err), 'error');
      }
    }
  }

  async function stopServer() {
    if (serverProcess && serverProcess.id) {
      await window.ConfigStudio.stopProcess(serverProcess.id);
      serverProcess = null;
      window.ConfigStudio.showNotification('Сервер остановлен', 'info');
      refreshPreview();
    }
  }

  // Auto-reload preview on file save
  window.ConfigStudio.onFileSave((file) => {
    if (previewActive && isWebFile(file.path)) {
      refreshPreview();
    }
  });

  // Reload on active file switch
  window.ConfigStudio.onFileOpen((file) => {
    if (previewActive && isWebFile(file.path)) {
      refreshPreview();
    }
  });

  console.log('[WebDevKit] Plugin initialized successfully.');
})();
`
	_ = os.WriteFile(filepath.Join(dir, "main.js"), []byte(mainJS), 0644)

	css := `.web-devkit-container {
  min-width: 320px;
}
.web-devkit-toolbar button {
  outline: none;
}
`
	_ = os.WriteFile(filepath.Join(dir, "style.css"), []byte(css), 0644)
}

func (m *Manager) seedRemoteAgent() {
	dir := filepath.Join(m.pluginsDir, "remote-agent")
	if _, err := os.Stat(filepath.Join(dir, "plugin.json")); err == nil {
		return // already exists
	}

	_ = os.MkdirAll(dir, 0755)

	manifest := `{
  "id": "remote-agent",
  "name": "Remote Server Agent",
  "version": "1.0.0",
  "description": "Manage, switch, and edit files across remote servers directly from one UI",
  "author": "Config Studio Team",
  "icon": "server",
  "entry": "main.js",
  "permissions": ["ui.panels", "network.bind"]
}
`
	_ = os.WriteFile(filepath.Join(dir, "plugin.json"), []byte(manifest), 0644)

	mainJS := `/**
 * Remote Server Agent Plugin
 * Allows connecting to remote Config Studio instances and switching servers from the header.
 */
(function() {
  const pluginId = 'remote-agent';
  if (!window.ConfigStudio) return;

  const storageKey = 'cs_remote_servers';
  let servers = [];
  try {
    servers = JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch (e) {
    servers = [];
  }

  // Register Server Switcher Button in Header
  window.ConfigStudio.registerHeaderItem({
    id: 'remote-agent-switcher',
    pluginId: pluginId,
    order: 10,
    render: (container) => {
      container.innerHTML = '';
      const select = document.createElement('select');
      select.className = 'px-2 py-1 text-xs rounded bg-base-surface border border-base-border text-gray-300 hover:text-white focus:outline-none focus:border-accent cursor-pointer';

      const localOpt = document.createElement('option');
      localOpt.value = 'local';
      localOpt.textContent = '🖥️ Localhost (Хост)';
      select.appendChild(localOpt);

      servers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.url;
        opt.textContent = '🌐 ' + s.name;
        select.appendChild(opt);
      });

      const addOpt = document.createElement('option');
      addOpt.value = '__add__';
      addOpt.textContent = '➕ Добавить сервер...';
      select.appendChild(addOpt);

      select.onchange = (e) => {
        if (e.target.value === '__add__') {
          showAddServerDialog();
          select.value = 'local';
        } else if (e.target.value === 'local') {
          window.ConfigStudio.setRemoteEndpoint(null);
          window.location.reload();
        } else {
          const selected = servers.find(s => s.url === e.target.value);
          if (selected) {
            window.ConfigStudio.setRemoteEndpoint(selected.url, selected.token);
            window.location.reload();
          }
        }
      };

      container.appendChild(select);
    }
  });

  function showAddServerDialog() {
    const name = prompt('Название сервера (например, Debian VPS):');
    if (!name) return;
    const url = prompt('URL удаленного агента (например, http://192.168.1.100:8080):');
    if (!url) return;
    const token = prompt('API ключ или токен (если включена авторизация, иначе оставьте пустым):') || '';

    servers.push({ name, url: url.replace(/\/$/, ''), token });
    localStorage.setItem(storageKey, JSON.stringify(servers));
    window.ConfigStudio.showNotification('Сервер ' + name + ' добавлен в список!', 'success');
    window.location.reload();
  }

  console.log('[RemoteAgent] Plugin initialized with', servers.length, 'servers.');
})();
`
	_ = os.WriteFile(filepath.Join(dir, "main.js"), []byte(mainJS), 0644)
}
