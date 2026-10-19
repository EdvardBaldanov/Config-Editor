import { ContextMenuItem, ContextMenuTarget, ContextMenuGroup } from '../types';

class ContextMenuRegistry {
  private items: Map<string, ContextMenuItem> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Registers a context menu item. Returns a function to unregister it.
   */
  register(item: ContextMenuItem): () => void {
    if (!item || !item.id) {
      console.warn('[ContextMenuRegistry] Invalid item registration without id');
      return () => {};
    }
    this.items.set(item.id, item);
    this.notify();
    return () => this.unregister(item.id);
  }

  /**
   * Unregisters a context menu item by ID.
   */
  unregister(id: string): void {
    if (this.items.delete(id)) {
      this.notify();
    }
  }

  /**
   * Unregisters all context menu items provided by a specific plugin.
   */
  unregisterByPlugin(pluginId: string): void {
    let changed = false;
    for (const [id, item] of this.items.entries()) {
      if (item.pluginId === pluginId) {
        this.items.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }

  /**
   * Clears all registered items.
   */
  clear(): void {
    this.items.clear();
    this.notify();
  }

  /**
   * Returns sorted items applicable to the given target.
   */
  getItemsForTarget(target: ContextMenuTarget): ContextMenuItem[] {
    const list: ContextMenuItem[] = [];

    for (const item of this.items.values()) {
      // 1. Check targetType
      if (item.targetType === 'file' && (target.isDir || !target.name)) continue;
      if (item.targetType === 'folder' && (!target.isDir || !target.name)) continue;
      if (item.targetType === 'empty' && target.name) continue;

      // 2. Check fileMatches if target is a file or folder with a name
      if (target.name && item.fileMatches && item.fileMatches.length > 0) {
        const matches = item.fileMatches.some((pattern) =>
          this.matchesPattern(pattern, target.name)
        );
        if (!matches) continue;
      }

      // 3. Check custom isVisible
      if (item.isVisible) {
        try {
          if (!item.isVisible(target)) continue;
        } catch (e) {
          console.error(`[ContextMenu] Error in isVisible for ${item.id}:`, e);
          continue;
        }
      }

      list.push(item);
    }

    // Sort by group and order
    const groupOrder: Record<ContextMenuGroup, number> = {
      open: 1,
      clipboard: 2,
      tools: 3,
      edit: 4,
      danger: 5,
    };

    return list.sort((a, b) => {
      const gA = groupOrder[a.group || 'tools'] ?? 99;
      const gB = groupOrder[b.group || 'tools'] ?? 99;
      if (gA !== gB) return gA - gB;
      const oA = a.order ?? 50;
      const oB = b.order ?? 50;
      return oA - oB;
    });
  }

  private matchesPattern(pattern: string, filename: string): boolean {
    if (pattern === '*' || pattern === '*.*') return true;
    try {
      const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
      return new RegExp(regexStr, 'i').test(filename);
    } catch {
      return pattern.toLowerCase() === filename.toLowerCase();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('[ContextMenuRegistry] listener error:', e);
      }
    });
  }
}

export const contextMenuRegistry = new ContextMenuRegistry();
