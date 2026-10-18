import { api, setRemoteEndpoint } from './api';
import {
  PluginItem,
  OpenFile,
  ToolbarButtonDef,
  SplitPanelDef,
  HeaderItemDef,
  ProcessInfo,
} from '../types';

export interface BottomPanelDef {
  id: string;
  pluginId: string;
  title: string;
  open: boolean;
  render: (container: HTMLElement) => void;
}

export interface PluginSystemState {
  plugins: PluginItem[];
  toolbarButtons: ToolbarButtonDef[];
  splitPanels: SplitPanelDef[];
  bottomPanels: BottomPanelDef[];
  headerItems: HeaderItemDef[];
  activeSplitPanelId: string | null;
  activeBottomPanelId: string | null;
}

type Listener = (state: PluginSystemState) => void;

class PluginLoader {
  private plugins: PluginItem[] = [];
  private toolbarButtons: ToolbarButtonDef[] = [];
  private splitPanels: SplitPanelDef[] = [];
  private bottomPanels: BottomPanelDef[] = [];
  private headerItems: HeaderItemDef[] = [];
  private activeSplitPanelId: string | null = null;
  private activeBottomPanelId: string | null = null;

  private onFileOpenCallbacks: Array<(file: OpenFile) => void> = [];
  private onFileSaveCallbacks: Array<(file: OpenFile) => void> = [];

  private listeners: Set<Listener> = new Set();
  private activeFileGetter: () => OpenFile | null = () => null;
  private activeContentSetter: (content: string) => void = () => {};
  private notificationHandler: (msg: string, type?: 'info' | 'success' | 'error') => void = (m) => alert(m);
  private confirmHandler: (command: string) => Promise<boolean> = async () => true;

  private monacoInstance: any = null;
  private editorInstance: any = null;
  private loadedPluginIds: Set<string> = new Set();
  private queuedCompletionProviders: Array<{ language: string; provider: any }> = [];
  private outlineProviders: Map<string, (content: string, filename: string) => OutlineNode[]> = new Map();

  private openFileHandler: (path: string) => Promise<void> = async () => {};
  private createFileHandler: (path: string, content?: string) => Promise<void> = async () => {};
  private refreshFilesHandler: () => Promise<void> = async () => {};

  getOutlineProvider(languageOrExt: string) {
    if (!languageOrExt) return undefined;
    return this.outlineProviders.get(languageOrExt.toLowerCase());
  }

  constructor() {
    this.setupGlobalAPI();
  }

  setMonacoInstances(monaco: any, editor: any) {
    this.monacoInstance = monaco;
    this.editorInstance = editor;

    if (this.monacoInstance && this.queuedCompletionProviders.length > 0) {
      for (const item of this.queuedCompletionProviders) {
        try {
          this.monacoInstance.languages.registerCompletionItemProvider(item.language, item.provider);
          console.log(`[PluginLoader] Registered completion provider for ${item.language}`);
        } catch (e) {
          console.error(`[PluginLoader] Error registering completion provider for ${item.language}:`, e);
        }
      }
      this.queuedCompletionProviders = [];
    }
  }

  private setupGlobalAPI() {
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

      registerBottomPanel: (panel: BottomPanelDef) => {
        this.bottomPanels = this.bottomPanels.filter((p) => p.id !== panel.id);
        this.bottomPanels.push(panel);
        this.notify();
      },

      toggleBottomPanel: (panelDef: Partial<BottomPanelDef> & { id: string }) => {
        let existing = this.bottomPanels.find((p) => p.id === panelDef.id);
        if (!existing && panelDef.render) {
          existing = {
            id: panelDef.id,
            pluginId: panelDef.pluginId || 'unknown',
            title: panelDef.title || 'Bottom Panel',
            open: true,
            render: panelDef.render,
          };
          this.bottomPanels.push(existing);
        } else if (existing) {
          if (panelDef.open !== undefined) {
            existing.open = panelDef.open;
          } else {
            existing.open = !existing.open;
          }
          if (panelDef.render) existing.render = panelDef.render;
        }

        this.activeBottomPanelId = existing && existing.open ? existing.id : null;
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

      getMonaco: () => this.monacoInstance,
      getEditor: () => this.editorInstance,
      registerCompletionProvider: (language: string, provider: any) => {
        if (this.monacoInstance) {
          return this.monacoInstance.languages.registerCompletionItemProvider(language, provider);
        }
        this.queuedCompletionProviders.push({ language, provider });
        return null;
      },

      registerOutlineProvider: (provider: {
        language: string;
        parse: (content: string, filename: string) => OutlineNode[];
      }) => {
        if (provider && provider.language && provider.parse) {
          this.outlineProviders.set(provider.language.toLowerCase(), provider.parse);
          console.log(`[PluginLoader] Registered custom outline provider for ${provider.language}`);
        }
      },

      openFile: async (path: string) => {
        await this.openFileHandler(path);
      },
      createFile: async (path: string, content?: string) => {
        await this.createFileHandler(path, content);
      },
      refreshFiles: async () => {
        await this.refreshFilesHandler();
      },

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

  init(options: {
    getActiveFile: () => OpenFile | null;
    setActiveContent: (content: string) => void;
    showNotification: (msg: string, type?: 'info' | 'success' | 'error') => void;
    confirmCommand: (command: string) => Promise<boolean>;
    openFile?: (path: string) => Promise<void>;
    createFile?: (path: string, content?: string) => Promise<void>;
    refreshFiles?: () => Promise<void>;
  }) {
    this.activeFileGetter = options.getActiveFile;
    this.activeContentSetter = options.setActiveContent;
    this.notificationHandler = options.showNotification;
    this.confirmHandler = options.confirmCommand;
    if (options.openFile) this.openFileHandler = options.openFile;
    if (options.createFile) this.createFileHandler = options.createFile;
    if (options.refreshFiles) this.refreshFilesHandler = options.refreshFiles;
  }

  async loadPlugins(): Promise<PluginItem[]> {
    try {
      this.plugins = await api.getPlugins();
      for (const p of this.plugins) {
        if (!p.enabled) continue;
        await this.injectPluginAssets(p);
      }
      this.notify();
      return this.plugins;
    } catch (e) {
      console.error('[PluginLoader] Failed to load plugins:', e);
      return [];
    }
  }

  private async injectPluginAssets(p: PluginItem) {
    // 1. Inject CSS if defined
    if (p.css) {
      const cssId = `plugin-css-${p.id}`;
      if (!document.getElementById(cssId)) {
        try {
          const res = await fetch(`/api/plugins/${encodeURIComponent(p.id)}/files/${p.css}?t=${Date.now()}`, {
            headers: { 'X-ConfigStudio-Web': '1' },
          });
          if (res.ok) {
            const cssText = await res.text();
            const style = document.createElement('style');
            style.id = cssId;
            style.textContent = cssText;
            document.head.appendChild(style);
          }
        } catch (e) {
          console.warn(`[PluginLoader] Failed to load CSS for ${p.id}:`, e);
        }
      }
    }

    // 2. Load and execute Script Entrypoint
    if (p.entry && !this.loadedPluginIds.has(p.id)) {
      try {
        const res = await fetch(`/api/plugins/${encodeURIComponent(p.id)}/files/${p.entry}?t=${Date.now()}`, {
          headers: { 'X-ConfigStudio-Web': '1' },
        });
        if (res.ok) {
          const code = await res.text();
          // Execute script with window.ConfigStudio in scope
          const runner = new Function('ConfigStudio', 'window', code);
          runner((window as any).ConfigStudio, window);
          this.loadedPluginIds.add(p.id);
          console.log(`[PluginLoader] Successfully initialized plugin: ${p.name} (${p.id})`);
          this.notify();
        } else {
          console.error(`[PluginLoader] Failed to fetch script for ${p.id}: HTTP ${res.status}`);
        }
      } catch (err) {
        console.error(`[PluginLoader] Error executing plugin ${p.id}:`, err);
      }
    }
  }

  removePluginAssets(id: string) {
    const css = document.getElementById(`plugin-css-${id}`);
    if (css) css.remove();

    this.loadedPluginIds.delete(id);
    this.toolbarButtons = this.toolbarButtons.filter((b) => b.pluginId !== id);
    this.splitPanels = this.splitPanels.filter((p) => p.pluginId !== id);
    this.bottomPanels = this.bottomPanels.filter((p) => p.pluginId !== id);
    this.headerItems = this.headerItems.filter((h) => h.pluginId !== id);

    if (this.activeSplitPanelId && this.splitPanels.every((p) => p.id !== this.activeSplitPanelId)) {
      this.activeSplitPanelId = null;
    }
    if (this.activeBottomPanelId && this.bottomPanels.every((p) => p.id !== this.activeBottomPanelId)) {
      this.activeBottomPanelId = null;
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
      bottomPanels: this.bottomPanels,
      headerItems: this.headerItems,
      activeSplitPanelId: this.activeSplitPanelId,
      activeBottomPanelId: this.activeBottomPanelId,
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

  closeBottomPanel(panelId: string) {
    const panel = this.bottomPanels.find((p) => p.id === panelId);
    if (panel) {
      panel.open = false;
    }
    if (this.activeBottomPanelId === panelId) {
      this.activeBottomPanelId = null;
    }
    this.notify();
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }
}

export const pluginManager = new PluginLoader();
