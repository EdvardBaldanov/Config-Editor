import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Terminal,
  Globe,
  Key,
  Server,
  Edit3,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { PendingInstall } from '../types';

interface PluginConsentModalProps {
  pending: PendingInstall | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isConfirming: boolean;
}

interface PermMeta {
  label: string;
  desc: string;
  risk: 'safe' | 'low' | 'medium' | 'critical';
  riskLabel: string;
  icon: React.ReactNode;
}

function getPermissionMeta(perm: string): PermMeta {
  switch (perm.toLowerCase()) {
    case 'fs.read':
      return {
        label: 'Чтение файлов проекта',
        desc: 'Просмотр содержимого конфигураций и файлов в рабочей директории',
        risk: 'low',
        riskLabel: 'Низкий риск',
        icon: <FileText size={16} className="text-blue-400" />,
      };
    case 'fs.write':
      return {
        label: 'Запись и изменение файлов',
        desc: 'Создание, редактирование и перезапись файлов конфигурации',
        risk: 'medium',
        riskLabel: 'Средний риск',
        icon: <Edit3 size={16} className="text-amber-400" />,
      };
    case 'shell.exec':
    case 'terminal.exec':
      return {
        label: 'Выполнение консольных команд на хосте',
        desc: 'Запуск CLI-утилит (make, docker, git) и системных процессов в ОС',
        risk: 'critical',
        riskLabel: 'Высокий риск',
        icon: <Terminal size={16} className="text-rose-400" />,
      };
    case 'remote.exec':
      return {
        label: 'Удаленное выполнение команд (SSH)',
        desc: 'Инициация команд и синхронизация конфигов на удаленных серверах',
        risk: 'critical',
        riskLabel: 'Высокий риск',
        icon: <Server size={16} className="text-rose-400" />,
      };
    case 'network':
    case 'network.bind':
      return {
        label: 'Сетевой доступ и локальные серверы',
        desc: 'Запуск встроенных веб-серверов и отправка сетевых запросов',
        risk: 'medium',
        riskLabel: 'Средний риск',
        icon: <Globe size={16} className="text-amber-400" />,
      };
    case 'secrets':
    case 'secrets.access':
      return {
        label: 'Доступ к защищенным учетным данным',
        desc: 'Чтение токенов, ключей доступа и SSH-паролей',
        risk: 'critical',
        riskLabel: 'Критический риск',
        icon: <Key size={16} className="text-rose-400" />,
      };
    default:
      if (perm.startsWith('ui.')) {
        return {
          label: `Интерфейс: ${perm}`,
          desc: 'Встраивание панелей, кнопок и вкладок в интерфейс Config Studio',
          risk: 'safe',
          riskLabel: 'Безопасно',
          icon: <Layers size={16} className="text-emerald-400" />,
        };
      }
      return {
        label: perm,
        desc: 'Дополнительное расширение возможностей редактора',
        risk: 'low',
        riskLabel: 'Низкий риск',
        icon: <HelpCircle size={16} className="text-gray-400" />,
      };
  }
}

export const PluginConsentModal: React.FC<PluginConsentModalProps> = ({
  pending,
  isOpen,
  onClose,
  onConfirm,
  isConfirming,
}) => {
  if (!isOpen || !pending) return null;

  const permissions = pending.manifest.permissions || [];
  const hasCritical = permissions.some((p) => {
    const meta = getPermissionMeta(p);
    return meta.risk === 'critical';
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#1e1e2e] border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-[#181825]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                hasCritical
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : pending.isOfficial
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              }`}
            >
              {hasCritical ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100">
                Запрос разрешений плагина
              </h2>
              <p className="text-xs text-gray-400">
                Проверьте запрашиваемые права перед установкой в Config Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Plugin Identification Card */}
          <div className="p-4 bg-[#14141e] border border-gray-800 rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-100 text-base">
                    {pending.manifest.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[11px] bg-gray-800 text-gray-300 font-mono">
                    v{pending.manifest.version}
                  </span>
                </div>
                {pending.manifest.author && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Автор:{' '}
                    <span className="text-gray-300 font-medium">
                      {pending.manifest.author}
                    </span>
                  </div>
                )}
              </div>

              {pending.isOfficial ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-medium whitespace-nowrap">
                  <CheckCircle2 size={13} />
                  <span>Verified Official</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium whitespace-nowrap">
                  <AlertTriangle size={13} />
                  <span>Community Plugin</span>
                </div>
              )}
            </div>

            {pending.manifest.description && (
              <p className="text-xs text-gray-400 leading-relaxed pt-1">
                {pending.manifest.description}
              </p>
            )}

            {pending.manifest.fileMatches && pending.manifest.fileMatches.length > 0 && (
              <div className="flex items-center gap-1.5 pt-2 text-xs text-gray-400">
                <span className="text-gray-400">Ассоциации файлов:</span>
                <div className="flex flex-wrap gap-1">
                  {pending.manifest.fileMatches.map((m) => (
                    <span
                      key={m}
                      className="px-1.5 py-0.2 bg-gray-800/80 text-teal-300 rounded font-mono text-[10px]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Capabilities & Permissions Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Запрашиваемые возможности ({permissions.length})
              </h3>
              {hasCritical && (
                <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={12} /> Требуется внимание
                </span>
              )}
            </div>

            {permissions.length === 0 ? (
              <div className="p-3 bg-gray-800/40 border border-gray-800 rounded-lg text-xs text-gray-400 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Плагин не требует системных привилегий (только визуальный интерфейс).</span>
              </div>
            ) : (
              <div className="space-y-2">
                {permissions.map((p) => {
                  const meta = getPermissionMeta(p);
                  return (
                    <div
                      key={p}
                      className="p-3 bg-[#14141e] border border-gray-800/80 rounded-lg flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">{meta.icon}</div>
                        <div>
                          <div className="font-medium text-xs text-gray-200">
                            {meta.label}
                          </div>
                          <div className="text-[11px] text-gray-400 leading-normal mt-0.5">
                            {meta.desc}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap shrink-0 ${
                          meta.risk === 'critical'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : meta.risk === 'medium'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : meta.risk === 'safe'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {meta.riskLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warning notice if high-risk permissions */}
          {hasCritical && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-300 leading-relaxed">
                Плагин запрашивает расширенные права на исполнение команд в системе хоста.
                Устанавливайте этот плагин только в том случае, если вы доверяете источнику и понимаете последствия.
              </div>
            </div>
          )}

          {!pending.isOfficial && !hasCritical && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-xs text-amber-300/90">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
              <span>
                Плагин разработан сторонним автором и не входит в официальный каталог верифицированных расширений.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700/50 bg-[#181825]">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Отклонить
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-md ${
              hasCritical
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/30'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-950/30'
            }`}
          >
            {isConfirming ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Установка...</span>
              </>
            ) : (
              <>
                <span>Разрешить и установить</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
