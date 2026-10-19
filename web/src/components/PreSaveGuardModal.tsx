import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft, Save, Code } from 'lucide-react';
import { GuardIssue } from '../types';

interface PreSaveGuardModalProps {
  isOpen: boolean;
  issue: GuardIssue | null;
  filePath: string;
  isSaving?: boolean;
  onClose: (targetLine?: number, targetCol?: number) => void;
  onForceSave: () => void;
}

export const PreSaveGuardModal: React.FC<PreSaveGuardModalProps> = ({
  isOpen,
  issue,
  filePath,
  isSaving = false,
  onClose,
  onForceSave,
}) => {
  if (!isOpen || !issue) return null;

  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#161b22] border-2 border-red-500/50 rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#c9d1d9]"
        style={{ boxShadow: '0 0 40px rgba(239, 68, 68, 0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-red-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Pre-Save Guard: Обнаружена ошибка
              </h2>
              <p className="text-xs text-red-300/80">
                Защита критической инфраструктуры предотвратила запись битого синтаксиса
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-red-900/60 text-red-200 border border-red-700/50">
            422 BLOCKED
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto">
          {/* File & Warning info */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8b949e]">Критический файл:</span>
              <span className="font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                {fileName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8b949e]">Локация:</span>
              <span className="font-mono text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/40">
                Строка {issue.line}, Колонка {issue.column}
              </span>
            </div>
            <div className="pt-2 border-t border-[#21262d] text-xs text-[#8b949e] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Этот файл помечен как чувствительный компонент системы. Сохранение с синтаксической ошибкой может
                привести к аварийному падению контейнеров или службы.
              </span>
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-red-400" /> Сообщение валидатора
            </label>
            <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 text-sm font-mono text-red-200">
              {issue.message}
            </div>
          </div>

          {/* Snippet preview */}
          {issue.snippet && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                Контекст в коде
              </label>
              <pre className="bg-[#090d13] border border-[#30363d] rounded-lg p-3 text-xs font-mono text-[#c9d1d9] overflow-x-auto leading-relaxed">
                {issue.snippet.split('\n').map((line, idx) => {
                  const isTarget = line.startsWith('>');
                  return (
                    <div
                      key={idx}
                      className={
                        isTarget
                          ? 'bg-red-500/20 text-red-200 font-bold px-1 rounded -mx-1 border-l-2 border-red-500'
                          : 'text-[#8b949e]'
                      }
                    >
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>
          )}

          <div className="text-[11px] text-[#8b949e] bg-[#0d1117] p-3 rounded-lg border border-[#21262d] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
            <span>
              При нажатии <strong>«Force Save»</strong> файл будет сохранен на диск, а инцидент будет зафиксирован
              в журнале аудита безопасности.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#30363d] bg-[#0d1117]">
          <button
            type="button"
            onClick={() => onForceSave()}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/40 border border-red-800/60 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Сохранение...' : 'Force Save (Все равно сохранить)'}
          </button>

          <button
            type="button"
            onClick={() => onClose(issue.line, issue.column)}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#00d2b4] hover:bg-[#00ba9f] rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00d2b4]/40"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к редактированию
          </button>
        </div>
      </div>
    </div>
  );
};
