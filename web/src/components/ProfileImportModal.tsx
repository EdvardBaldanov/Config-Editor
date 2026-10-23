import React, { useState } from 'react';
import {
  Share2,
  Check,
  X,
  Palette,
  Globe,
  Package,
  Layers,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ProfilePreview } from '../types';
import { translations } from '../utils/i18n';

interface ProfileImportModalProps {
  isOpen: boolean;
  preview: ProfilePreview | null;
  isImporting?: boolean;
  language?: string;
  onClose: () => void;
  onConfirm: (options: {
    applySettings: boolean;
    importSources: boolean;
    autoInstallPlugins: boolean;
  }) => Promise<void>;
}

export const ProfileImportModal: React.FC<ProfileImportModalProps> = ({
  isOpen,
  preview,
  isImporting = false,
  language = 'ru',
  onClose,
  onConfirm,
}) => {
  const [applySettings, setApplySettings] = useState(true);
  const [importSources, setImportSources] = useState(true);
  const [autoInstallPlugins, setAutoInstallPlugins] = useState(true);

  if (!isOpen || !preview) return null;

  const t = translations[language] || translations.ru;
  const profile = preview.profile || { exportedAt: '', app: {}, sources: [], plugins: [] };
  const settingsDiff = preview.settingsDiff || [];
  const newSources = preview.newSources || [];
  const pluginsStatus = preview.pluginsStatus || [];

  const toInstallCount = pluginsStatus.filter((p) => p?.action === 'to_install').length;
  const toEnableCount = pluginsStatus.filter((p) => p?.action === 'will_enable').length;

  const exportDateStr = profile.exportedAt
    ? new Date(profile.exportedAt).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU')
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-xl bg-base-surface border border-base-border rounded-3xl shadow-2xl overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-base-border bg-base/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {t.importProfileModalTitle}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.exportedAtPrefix} {exportDateStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[calc(80vh-140px)] overflow-y-auto custom-scrollbar">
          {/* Safe Note */}
          <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-teal-400">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
            <span>
              <strong>{t.safeTransferBadge}</strong> {t.safeTransferExplanation}
            </span>
          </div>

          {/* Option 1: Settings */}
          <div className="p-4 rounded-2xl border border-base-border bg-gray-50 dark:bg-black/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-900 dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={applySettings}
                  onChange={(e) => setApplySettings(e.target.checked)}
                  className="w-4 h-4 text-accent rounded accent-teal-500 cursor-pointer"
                />
                <Palette className="w-4 h-4 text-accent" />
                <span>{t.themeSettingsLabel}</span>
              </label>
              <span className="text-[11px] font-mono text-gray-400">
                {settingsDiff.length > 0 ? `${settingsDiff.length} ${t.diffChanges}` : t.diffNoChanges}
              </span>
            </div>

            {settingsDiff.length > 0 && applySettings && (
              <div className="pl-6 pt-1 space-y-1">
                {settingsDiff.map((diff, idx) => (
                  <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    • {diff}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Option 2: Sources */}
          <div className="p-4 rounded-2xl border border-base-border bg-gray-50 dark:bg-black/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-900 dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={importSources}
                  onChange={(e) => setImportSources(e.target.checked)}
                  className="w-4 h-4 text-accent rounded accent-teal-500 cursor-pointer"
                />
                <Globe className="w-4 h-4 text-accent" />
                <span>{t.sourcesLabel}</span>
              </label>
              <span className="text-[11px] font-mono text-gray-400">
                {newSources.length > 0 ? `+${newSources.length} ${t.diffNew}` : t.diffAllConnected}
              </span>
            </div>

            {newSources.length > 0 && importSources && (
              <div className="pl-6 pt-1 space-y-1">
                {newSources.map((s, idx) => (
                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                    <span className="font-medium">• {s.name}</span>
                    <span className="font-mono text-[10px] text-gray-500 truncate max-w-[200px]">{s.url}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Option 3: Plugins */}
          <div className="p-4 rounded-2xl border border-base-border bg-gray-50 dark:bg-black/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-900 dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoInstallPlugins}
                  onChange={(e) => setAutoInstallPlugins(e.target.checked)}
                  className="w-4 h-4 text-accent rounded accent-teal-500 cursor-pointer"
                />
                <Package className="w-4 h-4 text-accent" />
                <span>{t.pluginsLabel} ({pluginsStatus.length})</span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                {toInstallCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                    +{toInstallCount} {t.actionInstall}
                  </span>
                )}
                {toEnableCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 font-medium">
                    +{toEnableCount} {t.actionEnable}
                  </span>
                )}
              </div>
            </div>

            {autoInstallPlugins && pluginsStatus.length > 0 && (
              <div className="pl-6 pt-1 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {pluginsStatus.map((p) => {
                  let badge = (
                    <span className="text-[10px] text-gray-500 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                      {t.actionInstalled}
                    </span>
                  );
                  if (p.action === 'to_install') {
                    badge = (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded font-mono">
                        {t.actionInstall}
                      </span>
                    );
                  } else if (p.action === 'will_enable') {
                    badge = (
                      <span className="text-[10px] text-teal-400 bg-teal-950/40 border border-teal-800/40 px-1.5 py-0.5 rounded font-mono">
                        {t.actionEnable}
                      </span>
                    );
                  }

                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {p.name || p.id} <span className="text-[10px] text-gray-500 font-mono">v{p.version}</span>
                      </span>
                      {badge}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base-border bg-base/50 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ applySettings, importSources, autoInstallPlugins })}
            disabled={isImporting || (!applySettings && !importSources && !autoInstallPlugins)}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent text-gray-900 hover:opacity-90 transition-all flex items-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.applyingProfile}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{t.applyProfile}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
