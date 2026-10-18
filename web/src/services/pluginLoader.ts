import { api, setRemoteEndpoint } from './api';
import {
  PluginItem,
  OpenFile,
  ToolbarButtonDef,
  SplitPanelDef,
  HeaderItemDef,
  ProcessInfo,
} from '../types';

export interface PluginSystemState {
  plugins: PluginItem[];
  toolbarButtons: ToolbarButtonDef[];
  splitPanels: SplitPanelDef[];
  headerItems: HeaderItemDef[];
  activeSplitPanelId: string | null;
}

type Listener = (state: PluginSystemState) => void;

class PluginLoader {
  private plugins: PluginItem[] = [];
  private toolbarButtons: ToolbarButtonDef[] = [];
  private splitPanels: SplitPanelDef[] = [];
  private headerItems: HeaderItemDef[] = [];
  private activeSplitPanelId: string | null = null;

  private onFileOpenCallbacks: Array<(file: OpenFile) => void> = [];
  private onFileSaveCallbacks: Array<(file: OpenFile) => void> = [];

  private listeners: Set<Listener> = new Set();
  private activeFileGetter: () => OpenFile | null = () => null;
  private activeContentSetter: (content: string) => void = () => {};
  private notificationHandler: (msg: string, type?: 'info' | 'success' | 'error') => void = (m) => alert(m);
  private confirmHandler: (command: string) => Promise<boolean> = async () => true;

  init(options: {
    getActiveFile: () => OpenFile | null;
    setActiveContent: (content: string) => void;
    showNotification: (msg: string, type?: 'info' | 'success' | 'error') => void;
    confirmCommand: (command: string) => Promise<boolean>;
  }) {
    this.activeFileGetter = options.getActiveFile;
    this.activeContentSetter = options.setActiveContent;
    this.notificationHandler = options.showNotification;
    this.confirmHandler = options.confirmCommand;

    // Attach to window.ConfigStudio
    (window as any).ConfigStudio = {
      registerToolbarButton: (btn: ToolbarButtonDef) => {
        this.toolbarButtons = this.toolbarButtons.filter((b) => b.id !== btn.id);
        this.toolbarButtons.push(btn);
        this.notify();
      },

      registerSplitPanel: (panel: SplitPanelDef) => {
        this.splitPanels = this.splitPanels.filter((p) => p.id !== panel.id);
        this.splitPanels.push(panel);
        this.notify();
      },

      toggleSplitPanel: (panelDef: Partial<SplitPanelDef> & { id: string }) => {
        let existing = this.splitPanels.find((p) => p.id === panelDef.id);
        if (!existing && panelDef.render) {
          existing = {
            id: panelDef.id,
            pluginId: panelDef.pluginId || 'unknown',
            title: panelDef.title || 'Panel',
            open: true,
            render: panelDef.render,
          };
          this.splitPanels.push(existing);
        } else if (existing) {
          if (panelDef.open !== undefined) {
            existing.open = panelDef.open;
          } else {
            existing.open = !existing.open;
          }
          if (panelDef.render) existing.render = panelDef.render;
        }

        this.activeSplitPanelId = existing && existing.open ? existing.id : null;
        this.notify();
      },

      registerHeaderItem: (item: HeaderItemDef) => {
        this.headerItems = this.headerItems.filter((h) => h.id !== item.id);
        this.headerItems.push(item);
        this.notify();
      },

      onFileOpen: (cb: (file: OpenFile) => void) => {
        this.onFileOpenCallbacks.push(cb);
      },

      onFileSave: (cb: (file: OpenFile) => void) => {
        this.onFileSaveCallbacks.push(cb);
      },

      getActiveFile: () => this.activeFileGetter(),
      getActiveContent: () => this.activeFileGetter()?.content || '',
      setActiveContent: (content: string) => this.activeContentSetter(content),

      showNotification: (msg: string, type?: 'info' | 'success' | 'error') => {
        this.notificationHandler(msg, type);
      },

      setRemoteEndpoint: (url: string | null, token?: string) => {
        setRemoteEndpoint(url, token);
      },

      exec: async (req: {
        pluginId: string;
        command: string;
        args?: string[];
        cwd?: string;
      }) => {
        let confirmed = false;
        try {
          const res = await api.execPluginCommand(
            req.pluginId,
            req.command,
            req.args || [],
            req.cwd,
            false
          );
          if (res.requiresConfirm) {
            const ok = await this.confirmHandler(
              `${req.command} ${(req.args || []).join(' ')}`
            );
            if (!ok) throw new Error('Command execution denied by user');
            confirmed = true;
            return await api.execPluginCommand(
              req.pluginId,
              req.command,
              req.args || [],
              req.cwd,
              true
            );
          }
          return res;
        } catch (err: any) {
          throw err;
        }
      },

      startProcess: async (req: {
        pluginId: string;
        command: string;
        args?: string[];
        cwd?: string;
        port?: number;
      }) => {
        try {
          return await api.startPluginProcess(
            req.pluginId,
            req.command,
            req.args || [],
            req.cwd,
            req.port,
            false
          );
        } catch (err: any) {
          if (err.message && err.message.includes('needs confirmation')) {
            const ok = await this.confirmHandler(
              `${req.command} ${(req.args || []).join(' ')}`
            );
            if (!ok) throw new Error('Process launch denied by user');
            return await api.startPluginProcess(
              req.pluginId,
              req.command,
              req.args || [],
              req.cwd,
              req.port,
              true
            );
          }
          throw err;
        }
      },

      stopProcess: async (procId: string) => {
        await api.stopPluginProcess(procId);
      },
    };
  }

  async loadPlugins(): Promise<PluginItem[]> {
    try {
      this.plugins = await api.getPlugins();
      for (const p of this.plugins) {
        if (!p.enabled) continue;
        this.injectPluginAssets(p);
      }
      this.notify();
      return this.plugins;
    } catch (e) {
      console.error('[PluginLoader] Failed to load plugins:', e);
      return [];
    }
  }

  private injectPluginAssets(p: PluginItem) {
    // Inject CSS if defined
    if (p.css) {
      const cssId = `plugin-css-${p.id}`;
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = `/api/plugins/${encodeURIComponent(p.id)}/files/${p.css}?t=${Date.now()}`;
        document.head.appendChild(link);
      }
    }

    // Inject Script Entrypoint
    if (p.entry) {
      const scriptId = `plugin-script-${p.id}`;
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'text/javascript';
        script.src = `/api/plugins/${encodeURIComponent(p.id)}/files/${p.entry}?t=${Date.now()}`;
        document.body.appendChild(script);
      }
    }
  }

  removePluginAssets(id: string) {
    const css = document.getElementById(`plugin-css-${id}`);
    if (css) css.remove();
    const script = document.getElementById(`plugin-script-${id}`);
    if (script) script.remove();

    this.toolbarButtons = this.toolbarButtons.filter((b) => b.pluginId !== id);
    this.splitPanels = this.splitPanels.filter((p) => p.pluginId !== id);
    this.headerItems = this.headerItems.filter((h) => h.pluginId !== id);
    if (this.activeSplitPanelId && this.splitPanels.every((p) => p.id !== this.activeSplitPanelId)) {
      this.activeSplitPanelId = null;
    }
    this.notify();
  }

  notifyFileOpen(file: OpenFile) {
    this.onFileOpenCallbacks.forEach((cb) => {
      try {
        cb(file);
      } catch (err) {
        console.error('[Plugin] onFileOpen error:', err);
      }
    });
  }

  notifyFileSave(file: OpenFile) {
    this.onFileSaveCallbacks.forEach((cb) => {
      try {
        cb(file);
      } catch (err) {
        console.error('[Plugin] onFileSave error:', err);
      }
    });
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): PluginSystemState {
    return {
      plugins: this.plugins,
      toolbarButtons: this.toolbarButtons,
      splitPanels: this.splitPanels,
      headerItems: this.headerItems,
      activeSplitPanelId: this.activeSplitPanelId,
    };
  }

  closeSplitPanel(panelId: string) {
    const panel = this.splitPanels.find((p) => p.id === panelId);
    if (panel) {
      panel.open = false;
    }
    if (this.activeSplitPanelId === panelId) {
      this.activeSplitPanelId = null;
    }
    this.notify();
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }
}

export const pluginManager = new PluginLoader();
