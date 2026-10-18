import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { SplitPanelDef } from '../types';

interface PluginSplitPanelProps {
  panel: SplitPanelDef;
  onClose: () => void;
}

export const PluginSplitPanel: React.FC<PluginSplitPanelProps> = ({ panel, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = React.useState(false);

  useEffect(() => {
    if (containerRef.current) {
      panel.render(containerRef.current);
    }
  }, [panel]);

  return (
    <div
      className={`border-l border-base-border flex flex-col bg-base-surface transition-all duration-150 z-20 ${
        isMaximized ? 'fixed inset-0 z-50 bg-base' : 'w-[48%] min-w-[360px] max-w-[800px]'
      }`}
    >
      {/* Panel Header */}
      <div className="h-10 px-3.5 border-b border-base-border bg-base flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-semibold text-gray-200 tracking-wide">
            {panel.title}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-gray-400 hover:text-white hover:bg-base-surface-hover rounded transition"
            title={isMaximized ? 'Свернуть' : 'Развернуть на весь экран'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
            title="Закрыть панель"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Plugin Mount Target */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative" />
    </div>
  );
};
