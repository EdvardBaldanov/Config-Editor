import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronUp, ChevronDown, Terminal } from 'lucide-react';
import { BottomPanelDef } from '../services/pluginLoader';

interface PluginBottomPanelProps {
  panel: BottomPanelDef;
  onClose: () => void;
}

export const PluginBottomPanel: React.FC<PluginBottomPanelProps> = ({ panel, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(240);

  useEffect(() => {
    if (containerRef.current) {
      panel.render(containerRef.current);
    }
  }, [panel]);

  return (
    <div
      style={{ height: `${height}px` }}
      className="border-t border-base-border flex flex-col bg-base-surface transition-all duration-150 z-20 shrink-0"
    >
      {/* Panel Header */}
      <div className="h-8 px-3 border-b border-base-border bg-base flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <Terminal size={13} className="text-accent" />
          <span className="text-xs font-semibold text-gray-200 tracking-wide">
            {panel.title}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setHeight((h) => (h === 240 ? 420 : 240))}
            className="p-1 text-gray-400 hover:text-white hover:bg-base-surface-hover rounded transition"
            title={height === 240 ? 'Увеличить панель' : 'Уменьшить панель'}
          >
            {height === 240 ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
            title="Закрыть панель"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Plugin Mount Target */}
      <div ref={containerRef} className="flex-1 overflow-auto relative p-2" />
    </div>
  );
};
