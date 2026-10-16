import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  History,
  RotateCcw,
  Hash,
  Layers,
  Eye,
  EyeOff,
  GitCommit,
} from 'lucide-react';
import { OpenFile, Settings, FileRevision } from '../types';
import { translations } from '../utils/i18n';
import { computeSHA256, formatBytes, copyToClipboard } from '../utils/color';
import { api } from '../services/api';

interface FilePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: OpenFile | null;
  settings: Settings;
  onRestoreRevision: (content: string) => void;
}

export const FilePropertiesModal: React.FC<FilePropertiesModalProps> = ({
  isOpen,
  onClose,
  file,
  settings,
  onRestoreRevision,
}) => {
  const [sha256, setSha256] = useState<string>('Computing...');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'props' | 'history'>('props');
  const [selectedRev, setSelectedRev] = useState<FileRevision | null>(null);
  const [showDiff, setShowDiff] = useState<boolean>(false);

  const t = translations[settings.language] || translations.ru;

  useEffect(() => {
    if (file && isOpen) {
      // 1. Try compute on client via pure-JS SHA-256
      computeSHA256(file.content)
        .then((hash) => {
          if (hash) setSha256(hash);
        })
        .catch(() => {});

      // 2. Query authoritative server hash
      api.getFileInfo(file.path)
        .then((info) => {
          if (info.sha256) setSha256(info.sha256);
        })
        .catch(() => {});
    }
  }, [file?.content, file?.path, isOpen]);

  if (!isOpen || !file) return null;

  const handleCopyHash = async () => {
    const success = await copyToClipboard(sha256, 'sha256-input');
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lineCount = file.content.split('\n').length;
  const charCount = file.content.length;
  const byteSize = new Blob([file.content]).size;

  // Simple line diff calculation for preview
  const renderDiffLines = (revContent: string, currentContent: string) => {
    const revLines = revContent.split('\n');
    const curLines = currentContent.split('\n');

    const maxLines = Math.max(revLines.length, curLines.length);
    const rows = [];

    for (let i = 0; i < maxLines; i++) {
      const rLine = revLines[i];
      const cLine = curLines[i];

      if (rLine === cLine) {
        rows.push({
          num: i + 1,
          type: 'same',
          text: rLine ?? '',
        });
      } else {
        if (rLine !== undefined) {
          rows.push({
            num: i + 1,
            type: 'removed',
            text: `- ${rLine}`,
          });
        }
        if (cLine !== undefined) {
          rows.push({
            num: i + 1,
            type: 'added',
            text: `+ ${cLine}`,
          });
        }
      }
    }

    return rows.slice(0, 150); // limit to 150 lines preview
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none text-gray-800 dark:text-gray-200">
      <div className="w-full max-w-xl bg-base-surface border border-base-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with Tabs */}
        <div className="px-6 py-4 border-b border-base-border flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('props')}
              className={`flex items-center space-x-2 text-sm font-semibold pb-1 border-b-2 transition-colors ${
                activeTab === 'props'
                  ? 'border-accent text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 text-accent" />
              <span>{t.fileProperties}</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 text-sm font-semibold pb-1 border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-accent text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <History className="w-4 h-4 text-accent" />
              <span>{t.editHistory}</span>
              {file.revisions.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-accent text-slate-900 font-bold">
                  {file.revisions.length}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Properties */}
        {activeTab === 'props' && (
          <div className="p-6 space-y-4 text-xs">
            <div>
              <span className="block text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px] tracking-wider mb-1">
                Имя файла
              </span>
              <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">
                {file.name}
              </p>
            </div>

            <div>
              <span className="block text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px] tracking-wider mb-1">
                Путь на сервере
              </span>
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all bg-gray-100 dark:bg-black/20 p-2.5 rounded-xl border border-base-border">
                /{file.path}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-gray-100 dark:bg-black/20 border border-base-border">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">{t.fileSize}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {formatBytes(byteSize)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-100 dark:bg-black/20 border border-base-border">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">{t.lineCount}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {lineCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-100 dark:bg-black/20 border border-base-border">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">{t.charCount}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {charCount}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px] tracking-wider mb-1 flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-accent" />
                <span>{t.hashSha256}</span>
              </span>
              <div className="flex items-center space-x-2">
                <input
                  id="sha256-input"
                  type="text"
                  readOnly
                  value={sha256}
                  className="flex-1 px-3 py-2 font-mono text-[11px] bg-gray-100 dark:bg-black/30 text-gray-800 dark:text-gray-200 border border-base-border rounded-xl select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyHash}
                  className="flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-900 shadow-sm active:scale-95 transition-all"
                  style={{ backgroundColor: settings.accentColor }}
                  title="Copy SHA-256"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t.copied : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Revision History + Diff Preview */}
        {activeTab === 'history' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {file.revisions.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-12">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30 text-accent" />
                <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  {t.noRevisions}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
                  Контрольные точки создаются автоматически при каждом сохранении файла (Ctrl+S).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {file.revisions.map((rev, idx) => {
                  const isSelected = selectedRev?.id === rev.id;
                  return (
                    <div
                      key={rev.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'border-base-border bg-gray-50 dark:bg-black/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <GitCommit className="w-4 h-4 text-accent" />
                          <span className="font-bold text-gray-900 dark:text-white">
                            Версия #{file.revisions.length - idx}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(rev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (selectedRev?.id === rev.id) {
                                setSelectedRev(null);
                                setShowDiff(false);
                              } else {
                                setSelectedRev(rev);
                                setShowDiff(true);
                              }
                            }}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/10 border border-base-border hover:border-accent transition-colors"
                          >
                            {isSelected && showDiff ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3 text-accent" />
                            )}
                            <span>{isSelected && showDiff ? t.hideDiff : t.showDiff}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(t.restoreVersion + '?')) {
                                onRestoreRevision(rev.content);
                                onClose();
                              }
                            }}
                            className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold text-slate-900 shadow-sm active:scale-95 transition-all"
                            style={{ backgroundColor: settings.accentColor }}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{t.restoreVersion}</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-500 mt-1 pl-6 flex items-center space-x-3">
                        <span>{rev.linesCount} строк</span>
                        {rev.linesDelta !== 0 && (
                          <span
                            className={`font-semibold font-mono ${
                              rev.linesDelta > 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {rev.linesDelta > 0 ? `+${rev.linesDelta} строк` : `${rev.linesDelta} строк`}
                          </span>
                        )}
                      </div>

                      {/* Mini Diff Preview Box */}
                      {isSelected && showDiff && (
                        <div className="mt-3 pt-3 border-t border-base-border">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                            <span>Разница с текущим содержимым:</span>
                            <span className="text-accent">Предпросмотр</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/40 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed border border-white/5 space-y-0.5">
                            {renderDiffLines(rev.content, file.content).map((diffRow, dIdx) => (
                              <div
                                key={dIdx}
                                className={`px-1.5 py-0.5 rounded whitespace-pre-wrap break-all ${
                                  diffRow.type === 'added'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : diffRow.type === 'removed'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'text-gray-400 opacity-60'
                                }`}
                              >
                                {diffRow.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-base-border flex justify-end bg-gray-50 dark:bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
