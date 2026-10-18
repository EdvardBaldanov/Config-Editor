import React, { useRef, useEffect, useMemo } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { OpenFile, Settings, OutlineNode, ToolbarButtonDef } from '../types';
import { X, FileCode, Hash, Play, Globe, Server, Terminal, Sparkles } from 'lucide-react';
import { translations } from '../utils/i18n';
import { getLuminance } from '../utils/color';
import { pluginManager } from '../services/pluginLoader';

interface EditorProps {
  tabs: OpenFile[];
  activeFilePath: string | null;
  settings: Settings;
  outline?: OutlineNode[];
  pluginButtons?: ToolbarButtonDef[];
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (val: string) => void;
  onSave: () => void;
  onSelectLine?: (line: number, shouldFocus?: boolean) => void;
  editorRef: React.MutableRefObject<any>;
}

export const Editor: React.FC<EditorProps> = ({
  tabs,
  activeFilePath,
  settings,
  outline = [],
  pluginButtons = [],
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onSave,
  onSelectLine,
  editorRef,
}) => {
  const monacoInstanceRef = useRef<any>(null);
  const tagsScrollRef = useRef<HTMLDivElement>(null);
  const t = translations[settings.language] || translations.ru;

  const handleTagsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tagsScrollRef.current && e.deltaY !== 0) {
      tagsScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const currentFile = tabs.find((t) => t.path === activeFilePath) || null;

  const isLight =
    settings.themeMode === 'light' ||
    getLuminance(settings.baseColor || '#161b22') > 0.55;

  const defineCustomTheme = (monaco: any) => {
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'type', foreground: '00d2b4' },
        { token: 'string', foreground: '4ade80' },
        { token: 'number', foreground: 'facc15' },
        { token: 'keyword', foreground: '38bdf8' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': settings.baseColor || '#161b22',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': settings.accentColor || '#00d2b4',
        'editor.selectionBackground': '#264f78',
        'editor.lineHighlightBackground': '#1f242c',
        'editorCursor.foreground': settings.accentColor || '#00d2b4',
      },
    });

    const lightBg =
      getLuminance(settings.baseColor || '') > 0.55
        ? settings.baseColor
        : '#ffffff';

    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'type', foreground: '0284c7' },
        { token: 'string', foreground: '15803d' },
        { token: 'number', foreground: 'b45309' },
        { token: 'keyword', foreground: '0369a1' },
        { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': lightBg,
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': settings.accentColor || '#00d2b4',
        'editor.selectionBackground': '#bfdbfe',
        'editorCursor.foreground': settings.accentColor || '#00d2b4',
      },
    });
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoInstanceRef.current = monaco;
    pluginManager.setMonacoInstances(monaco, editor);

    defineCustomTheme(monaco);
    monaco.editor.setTheme(isLight ? 'custom-light' : 'custom-dark');

    // Add Ctrl+S command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });
  };

  useEffect(() => {
    if (monacoInstanceRef.current && editorRef.current) {
      defineCustomTheme(monacoInstanceRef.current);
      monacoInstanceRef.current.editor.setTheme(
        isLight ? 'custom-light' : 'custom-dark'
      );
    }
  }, [settings.baseColor, settings.accentColor, settings.themeMode, isLight]);

  // Extract all root sections for the full-width Quick Jump tag bar
  const rootTags = useMemo(() => {
    return (outline || []).map((node) => ({
      id: node.id,
      label: node.label,
      line: node.line,
      type: node.type,
    }));
  }, [outline]);

  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'json':
      case 'jsonc':
        return 'json';
      case 'toml':
      case 'ini':
      case 'conf':
      case 'cfg':
      case 'env':
        return 'ini';
      case 'html':
      case 'htm':
        return 'html';
      case 'php':
      case 'phtml':
        return 'php';
      case 'js':
      case 'javascript':
        return 'javascript';
      case 'ts':
      case 'typescript':
        return 'typescript';
      case 'css':
        return 'css';
      case 'sql':
        return 'sql';
      case 'sh':
      case 'bash':
        return 'shell';
      case 'md':
        return 'markdown';
      case 'xml':
        return 'xml';
      default:
        return 'yaml';
    }
  };

  if (tabs.length === 0 || !currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-base text-gray-500 select-none">
        <FileCode className="w-16 h-16 mb-3 opacity-30 text-accent" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {settings.language === 'ru' ? 'Нет открытых файлов' : 'No files opened'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {settings.language === 'ru'
            ? 'Выберите файл из проводника слева или перетащите его для редактирования'
            : 'Select a file from the explorer on the left or upload one to edit'}
        </p>
      </div>
    );
  }

  const visiblePluginButtons = pluginButtons.filter((btn) => !btn.visible || btn.visible());

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-base">
      {/* Multi-Tab Bar & Plugin Action Buttons */}
      <div className="h-10 bg-base-surface border-b border-base-border flex items-center justify-between px-2 select-none flex-shrink-0">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.path === activeFilePath;
            return (
              <div
                key={tab.path}
                onClick={() => onSelectTab(tab.path)}
                className={`group flex items-center space-x-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-all border-b-2 max-w-[200px] ${
                  isActive
                    ? 'bg-base text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                }`}
                style={{
                  borderBottomColor: isActive ? settings.accentColor : 'transparent',
                }}
              >
                <span className="truncate">{tab.name}</span>
                {tab.isDirty && (
                  <span
                    className="w-2 h-2 rounded-full inline-block animate-pulse flex-shrink-0"
                    style={{ backgroundColor: settings.accentColor }}
                    title="Несохраненные изменения"
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                  className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/20 text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
                  title="Закрыть вкладку"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Plugin Action Buttons (e.g. Live Preview) */}
        {visiblePluginButtons.length > 0 && (
          <div className="flex items-center space-x-1.5 pl-2 shrink-0">
            {visiblePluginButtons.map((btn) => {
              const renderIcon = () => {
                if (btn.icon === 'globe') return <Globe size={12} />;
                if (btn.icon === 'server') return <Server size={12} />;
                if (btn.icon === 'terminal') return <Terminal size={12} />;
                if (btn.icon === 'sparkles') return <Sparkles size={12} />;
                if (btn.icon && btn.icon.length <= 4) return <span className="text-xs">{btn.icon}</span>;
                return <Play size={11} fill="currentColor" />;
              };

              return (
                <button
                  key={btn.id}
                  onClick={btn.onClick}
                  title={btn.title || btn.label}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-accent text-gray-900 hover:opacity-90 shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {renderIcon()}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Jump Root Tag Cloud placed under the tabs */}
      {rootTags.length > 0 && (
        <div
          onWheel={handleTagsWheel}
          className="min-h-[46px] bg-base-surface/80 border-b border-base-border flex items-center px-3 space-x-2 select-none flex-shrink-0"
        >
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0 mr-1">
            <Hash className="w-4 h-4 text-accent" />
            <span>{t.quickJump}</span>
          </div>
          <div
            ref={tagsScrollRef}
            className="flex-1 flex items-center space-x-2 overflow-x-auto py-2 pb-2.5 horizontal-tags-scroll"
          >
            {rootTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onSelectLine && onSelectLine(tag.line, true)}
                className="px-3 py-1 rounded-xl text-xs font-mono whitespace-nowrap bg-white/90 dark:bg-white/5 border border-base-border hover:border-accent hover:text-accent text-gray-700 dark:text-gray-300 transition-all shadow-2xs active:scale-95 flex-shrink-0 flex items-center space-x-1.5"
                title={`Строка ${tag.line}`}
              >
                <span>{tag.label}</span>
                <span className="text-[10px] text-gray-400 font-sans">:{tag.line}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monaco Code Editor */}
      <div className="flex-1 w-full h-full min-h-0">
        <MonacoEditor
          height="100%"
          language={getLanguage(currentFile.name)}
          value={currentFile.content}
          theme={settings.themeMode === 'dark' ? 'custom-dark' : 'custom-light'}
          onMount={handleEditorMount}
          onChange={(value) => onChangeContent(value || '')}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            lineNumbersMinChars: 3,
            renderWhitespace: 'selection',
            folding: true,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
          }}
        />
      </div>
    </div>
  );
};
