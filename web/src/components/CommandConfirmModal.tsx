import React from 'react';
import { AlertTriangle, Terminal, Check, X, ShieldAlert } from 'lucide-react';

interface CommandConfirmModalProps {
  isOpen: boolean;
  command: string;
  onConfirm: () => void;
  onDeny: () => void;
}

export const CommandConfirmModal: React.FC<CommandConfirmModalProps> = ({
  isOpen,
  command,
  onConfirm,
  onDeny,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-md bg-base-surface border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-gray-100">
        <div className="px-5 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center space-x-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100">
              Подтверждение выполнения команды
            </h3>
            <p className="text-xs text-amber-400/90 font-medium">
              Плагин запрашивает запуск процесса на хост-системе
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-300 leading-relaxed">
            Команда классифицирована системой безопасности как требующая вашего прямого согласия:
          </p>

          <div className="bg-black/60 border border-base-border rounded-xl p-3 flex items-start space-x-2 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
            <Terminal size={14} className="mt-0.5 shrink-0 text-gray-500" />
            <span className="break-all">{command}</span>
          </div>

          <p className="text-[11px] text-gray-400">
            Система безопасности Config Studio требует явного согласия администратора перед выполнением команд, способных повлиять на состояние хоста (без скрытых автоподтверждений).
          </p>
        </div>

        <div className="px-5 py-3.5 bg-base border-t border-base-border flex items-center justify-end space-x-2.5">
          <button
            onClick={onDeny}
            className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-base-surface hover:bg-base-surface-hover border border-base-border rounded-lg transition"
          >
            Отклонить
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs font-semibold text-gray-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md transition flex items-center space-x-1.5"
          >
            <Check size={14} />
            <span>Разрешить</span>
          </button>
        </div>
      </div>
    </div>
  );
};
