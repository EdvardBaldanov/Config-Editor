import { Settings, FileItem } from '../types';

async function webFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set('X-ConfigStudio-Web', '1');
  return fetch(url, {
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

  async getFileInfo(path: string): Promise<{ path: string; name: string; size: number; lineCount: number; charCount: number; sha256: string }> {
    const res = await webFetch(`/api/fs/info?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get file info');
    }
    return res.json();
  },

  async saveFile(path: string, content: string, backup: boolean = true): Promise<void> {
    const res = await webFetch('/api/fs/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, backup }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save file');
    }
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
};
