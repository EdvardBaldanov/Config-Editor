import React, { useEffect, useRef, useState } from 'react';
import {
  Folder,
  FolderPlus,
  FilePlus,
  FileText,
  FileCode,
  CornerLeftUp,
  Edit2,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  RefreshCw,
  ExternalLink,
  Download,
  Upload,
  Terminal,
  Play,
  Shield,
  Archive,
  Layers,
  Sparkles,
  Code,
  Check,
  Info,
  Settings as SettingsIcon,
} from 'lucide-react';
import { ContextMenuItem, ContextMenuTarget, ContextMenuGroup } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  target: ContextMenuTarget;
  onClose: () => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  folder: Folder,
  folderplus: FolderPlus,
  fileplus: FilePlus,
  filetext: FileText,
  filecode: FileCode,
  cornerleftup: CornerLeftUp,
  edit: Edit2,
  edit2: Edit2,
  trash: Trash2,
  trash2: Trash2,
  delete: Trash2,
  copy: Copy,
  scissors: Scissors,
  cut: Scissors,
  clipboard: Clipboard,
  paste: Clipboard,
  refresh: RefreshCw,
  refreshcw: RefreshCw,
  externallink: ExternalLink,
  download: Download,
  upload: Upload,
  terminal: Terminal,
  play: Play,
  run: Play,
  shield: Shield,
  archive: Archive,
  layers: Layers,
  sparkles: Sparkles,
  code: Code,
  check: Check,
  info: Info,
  settings: SettingsIcon,
};

function renderItemIcon(iconName?: string, isDanger?: boolean) {
  if (!iconName) {
    return <span className="w-4 h-4 inline-block" />;
  }
  const cleanKey = iconName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const IconComponent = iconMap[cleanKey] || Sparkles;
  const colorClass = isDanger ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 group-hover:text-current';
  return <IconComponent className={`w-4 h-4 flex-shrink-0 ${colorClass}`} />;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  target,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x, y });

  // Smart Viewport Clamping
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;

      const padding = 8;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      if (newX + rect.width > winW - padding) {
        newX = winW - rect.width - padding;
      }
      if (newY + rect.height > winH - padding) {
        newY = winH - rect.height - padding;
      }
      if (newX < padding) newX = padding;
      if (newY < padding) newY = padding;

      setCoords({ x: newX, y: newY });
    }
  }, [x, y, items]);

  // Click Outside, Escape key & Scroll listener to auto-close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  if (!items || items.length === 0) {
    return null;
  }

  // Group items with dividers between different groups
  const renderedElements: React.ReactNode[] = [];
  let lastGroup: ContextMenuGroup | undefined = undefined;

  items.forEach((item, index) => {
    const isFirst = index === 0;
    const groupChanged = !isFirst && item.group !== lastGroup;

    if (groupChanged) {
      renderedElements.push(
        <div
          key={`sep-${item.group || 'tools'}-${index}`}
          className="my-1 border-t border-base-border opacity-70"
        />
      );
    }
    lastGroup = item.group;

    const isEnabled = item.isEnabled ? item.isEnabled(target) : true;
    const isDanger = item.group === 'danger';

    renderedElements.push(
      <button
        key={item.id}
        disabled={!isEnabled}
        onClick={async (e) => {
          e.stopPropagation();
          onClose();
          try {
            await item.onClick(target);
          } catch (err) {
            console.error(`[ContextMenu] Error executing action '${item.id}':`, err);
          }
        }}
        className={`group w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors rounded-lg ${
          !isEnabled
            ? 'opacity-40 cursor-not-allowed text-gray-400'
            : isDanger
            ? 'text-red-500 hover:bg-red-500/15 hover:text-red-600'
            : 'text-gray-700 dark:text-gray-200 hover:bg-accent/15 hover:text-accent font-medium'
        }`}
      >
        <div className="flex items-center space-x-2.5 truncate min-w-0 mr-2">
          {renderItemIcon(item.icon, isDanger)}
          <span className="truncate">{item.label}</span>
        </div>

        {item.shortcut && (
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 group-hover:text-accent/80 flex-shrink-0 ml-3">
            {item.shortcut}
          </span>
        )}
      </button>
    );
  });

  return (
    <div
      ref={menuRef}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      className="fixed z-[9999] min-w-[210px] max-w-[290px] bg-base-surface border border-base-border rounded-xl shadow-2xl p-1 backdrop-blur-lg select-none animate-in fade-in zoom-in-95 duration-100"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Target hint header if file/folder */}
      {target.name && (
        <div className="px-3 py-1 mb-1 border-b border-base-border/50 text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
          {target.name}
        </div>
      )}
      <div className="space-y-0.5">{renderedElements}</div>
    </div>
  );
};
