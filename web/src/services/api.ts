import { Settings, FileItem, FileInfo, PluginItem, PendingInstall, ProcessInfo, AuditEvent, AuditQueryResponse, GuardIssue, GuardValidationResult } from '../types';

export class PreSaveGuardError extends Error {
  guard: GuardIssue;
  issues: GuardIssue[];
  constructor(message: string, guard: GuardIssue, issues: GuardIssue[] = []) {
    super(message);
    this.name = 'PreSaveGuardError';
    this.guard = guard;
    this.issues = issues;
  }
}

let remoteEndpoint: string | null = localStorage.getItem('cs_active_remote_endpoint');
let remoteToken: string | null = localStorage.getItem('cs_active_remote_token');

export function setRemoteEndpoint(endpoint: string | null, token: string = '') {
  if (endpoint) {
    localStorage.setItem('cs_active_remote_endpoint', endpoint);
    localStorage.setItem('cs_active_remote_token', token);
    remoteEndpoint = endpoint;
    remoteToken = token;
  } else {
    localStorage.removeItem('cs_active_remote_endpoint');
    localStorage.removeItem('cs_active_remote_token');
    remoteEndpoint = null;
    remoteToken = null;
  }
}

export function getRemoteEndpoint() {
  return { endpoint: remoteEndpoint, token: remoteToken };
}

async function webFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set('X-ConfigStudio-Web', '1');
  if (remoteToken) {
    headers.set('Authorization', `Bearer ${remoteToken}`);
    headers.set('X-API-Key', remoteToken);
  }
  const baseUrl = remoteEndpoint ? remoteEndpoint.replace(/\/$/, '') : '';
  const finalUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  return fetch(finalUrl, {
    ...options,
    headers,
  });
}

export const api = {
  async getAuthStatus(): Promise<{ authRequired: boolean; authenticated: boolean; user: string }> {
    const res = await webFetch('/api/auth/status');
    if (!res.ok) return { authRequired: false, authenticated: true, user: 'guest' };
    return res.json();
  },

  async login(username: string, password: string): Promise<void> {
    const res = await webFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid credentials');
    }
  },

  async logout(): Promise<void> {
    await webFetch('/api/auth/logout', { method: 'POST' });
  },

  async getSettings(): Promise<Settings> {
    const res = await webFetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await webFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings');
    }
    return res.json();
  },

  async uploadIcon(file: File): Promise<Settings> {
    const formData = new FormData();
    formData.append('icon', file);
    const res = await webFetch('/api/settings/icon', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload icon');
    }
    return res.json();
  },

  async getTree(path: string = ''): Promise<{ path: string; items: FileItem[] }> {
    const params = new URLSearchParams();
    if (path) params.set('path', path);
    const res = await webFetch(`/api/fs/tree?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list directory');
    }
    const data = await res.json();
    return {
      path: data.path || '',
      items: data.items || [],
    };
  },

  async getFile(path: string): Promise<{ path: string; name: string; content: string }> {
    const res = await webFetch(`/api/fs/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to read file');
    }
    return res.json();
  },

  async getFileInfo(path: string): Promise<FileInfo> {
    const res = await webFetch(`/api/fs/info?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get file info');
    }
    return res.json();
  },

  async saveFile(path: string, content: string, backup: boolean = true, force: boolean = false): Promise<void> {
    const res = await webFetch('/api/fs/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, backup, force }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 422 && err.guard) {
        throw new PreSaveGuardError(err.error || 'Syntax validation failed for sensitive file', err.guard, err.issues || []);
      }
      throw new Error(err.error || 'Failed to save file');
    }
  },

  async validateGuard(path: string, content: string): Promise<GuardValidationResult> {
    const res = await webFetch('/api/guard/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) {
      throw new Error('Failed to validate guard');
    }
    return res.json();
  },

  async createItem(path: string, isDir: boolean): Promise<void> {
    const res = await webFetch('/api/fs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, isDir }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create item');
    }
  },

  async deleteItem(path: string): Promise<void> {
    const res = await webFetch('/api/fs/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete item');
    }
  },

  async renameItem(oldPath: string, newPath: string): Promise<void> {
    const res = await webFetch('/api/fs/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to rename item');
    }
  },

  async uploadFile(dirPath: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('path', dirPath);
    formData.append('file', file);
    const res = await webFetch('/api/fs/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload file');
    }
    const data = await res.json();
    return data.path;
  },

  getDownloadUrl(path: string): string {
    return `/api/fs/download?path=${encodeURIComponent(path)}`;
  },

  async searchFiles(query: string = ''): Promise<FileItem[]> {
    const res = await webFetch(`/api/fs/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return data.items || [];
  },

  // Plugin APIs
  async getPlugins(): Promise<PluginItem[]> {
    const res = await webFetch('/api/plugins');
    if (!res.ok) throw new Error('Failed to load plugins');
    const data = await res.json();
    return data.plugins || [];
  },

  async togglePlugin(id: string, enabled: boolean): Promise<PluginItem> {
    const res = await webFetch('/api/plugins/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle plugin');
    }
    return res.json();
  },

  async inspectPluginZip(file: File): Promise<PendingInstall> {
    const formData = new FormData();
    formData.append('plugin', file);
    const res = await webFetch('/api/plugins/inspect/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to inspect plugin archive');
    }
    const data = await res.json();
    return data.pending;
  },

  async inspectPluginUrl(url: string): Promise<PendingInstall> {
    const res = await webFetch('/api/plugins/inspect/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to inspect plugin from URL');
    }
    const data = await res.json();
    return data.pending;
  },

  async confirmPluginInstall(tempKey: string): Promise<PluginItem> {
    const res = await webFetch('/api/plugins/install/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to confirm plugin installation');
    }
    const data = await res.json();
    return data.plugin;
  },

  async cancelPluginInstall(tempKey: string): Promise<void> {
    await webFetch('/api/plugins/install/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempKey }),
    }).catch(() => {});
  },

  async uploadPluginZip(file: File): Promise<PluginItem> {
    const formData = new FormData();
    formData.append('plugin', file);
    const res = await webFetch('/api/plugins/install/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload plugin archive');
    }
    const data = await res.json();
    return data.plugin;
  },

  async installPluginUrl(url: string): Promise<PluginItem> {
    const res = await webFetch('/api/plugins/install/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to install plugin from URL');
    }
    const data = await res.json();
    return data.plugin;
  },

  async deletePlugin(id: string): Promise<void> {
    const res = await webFetch(`/api/plugins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete plugin');
    }
  },

  async execPluginCommand(
    pluginId: string,
    command: string,
    args: string[] = [],
    cwd?: string,
    confirmed?: boolean
  ): Promise<any> {
    const res = await webFetch('/api/plugins/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId, command, args, cwd, confirmed }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Command execution failed');
    }
    return res.json();
  },

  async startPluginProcess(
    pluginId: string,
    command: string,
    args: string[] = [],
    cwd?: string,
    port?: number,
    confirmed?: boolean
  ): Promise<ProcessInfo> {
    const res = await webFetch('/api/plugin-processes/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId, command, args, cwd, port, confirmed }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start process');
    }
    return res.json();
  },

  async stopPluginProcess(processId: string): Promise<void> {
    const res = await webFetch('/api/plugin-processes/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to stop process');
    }
  },

  async getPluginProcesses(): Promise<ProcessInfo[]> {
    const res = await webFetch('/api/plugin-processes');
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return data.processes || [];
  },

  async getPluginProcessLogs(processId: string): Promise<string> {
    const res = await webFetch(`/api/plugin-processes/${encodeURIComponent(processId)}/logs`);
    if (!res.ok) return '';
    const data = await res.json().catch(() => ({}));
    return data.logs || '';
  },

  async getAuditLogs(params: {
    limit?: number;
    offset?: number;
    action?: string;
    severity?: string;
    search?: string;
  } = {}): Promise<AuditQueryResponse> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.action) query.set('action', params.action);
    if (params.severity) query.set('severity', params.severity);
    if (params.search) query.set('search', params.search);

    const res = await webFetch(`/api/audit/logs?${query.toString()}`);
    if (!res.ok) return { events: [], total: 0 };
    return res.json();
  },

  async exportAuditLogs(): Promise<Blob> {
    const res = await webFetch('/api/audit/export');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to export audit logs');
    }
    return res.blob();
  },

  getAuditExportUrl(): string {
    const baseUrl = remoteEndpoint ? remoteEndpoint.replace(/\/$/, '') : '';
    return `${baseUrl}/api/audit/export?web=1`;
  },
};
