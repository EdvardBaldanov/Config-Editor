/**
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

  // Get scoped translation helper safely
  const i18nHelper = window.ConfigStudio.i18n && window.ConfigStudio.i18n.scoped
    ? window.ConfigStudio.i18n.scoped(pluginId)
    : null;
  const t = typeof i18nHelper === 'function'
    ? i18nHelper
    : (i18nHelper && typeof i18nHelper.t === 'function')
    ? i18nHelper.t
    : (key, fallback, params) => {
        let res = fallback || key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
        }
        return res;
      };

  let renderSelect = null;

  // Register Server Switcher in Header
  window.ConfigStudio.registerHeaderItem({
    id: 'remote-agent-switcher',
    pluginId: pluginId,
    order: 10,
    render: (container) => {
      renderSelect = () => {
        container.innerHTML = '';
        const select = document.createElement('select');
        select.className = 'px-2.5 py-1 text-xs rounded-xl bg-gray-100 dark:bg-white/10 border border-base-border text-gray-800 dark:text-gray-100 hover:text-accent focus:outline-none focus:border-accent cursor-pointer transition font-medium';

        const localOpt = document.createElement('option');
        localOpt.value = 'local';
        localOpt.textContent = t('localhost', '🖥️ Localhost (Хост)');
        select.appendChild(localOpt);

        servers.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.url;
          opt.textContent = '🌐 ' + s.name;
          select.appendChild(opt);
        });

        const addOpt = document.createElement('option');
        addOpt.value = '__add__';
        addOpt.textContent = t('addServer', '➕ Добавить сервер...');
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
      };

      renderSelect();
    }
  });

  // Re-render when language changes
  if (window.ConfigStudio.i18n && window.ConfigStudio.i18n.onLanguageChange) {
    window.ConfigStudio.i18n.onLanguageChange(() => {
      if (typeof renderSelect === 'function') {
        renderSelect();
      }
    });
  }

  function showAddServerDialog() {
    const name = prompt(t('promptName', 'Название сервера (например, Debian VPS):'));
    if (!name) return;
    const url = prompt(t('promptUrl', 'URL удаленного агента (например, http://192.168.1.100:8080):'));
    if (!url) return;
    const token = prompt(t('promptToken', 'API ключ или токен (если включена авторизация, иначе оставьте пустым):')) || '';

    servers.push({ name, url: url.replace(/\/$/, ''), token });
    localStorage.setItem(storageKey, JSON.stringify(servers));
    window.ConfigStudio.showNotification(t('serverAdded', 'Сервер ' + name + ' добавлен в список!', { name }), 'success');
    window.location.reload();
  }

  console.log('[RemoteAgent] Plugin initialized with ' + servers.length + ' remote servers.');
})();
