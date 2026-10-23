import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Trash2,
  Download,
  FileArchive,
  Link2,
  Upload,
  FolderOpen,
  AlertTriangle,
  Check,
  CheckCircle2,
  Settings as SettingsIcon,
} from 'lucide-react';
import { PluginItem, CatalogItem, PendingInstall } from '../../../types';
import { api } from '../../../services/api';
import { getPluginName, getPluginDescription } from '../../../utils/i18n';
import { PluginConsentModal } from '../../PluginConsentModal';

interface PluginsTabProps {
  pluginExecUnrestricted: boolean;
  setPluginExecUnrestricted: (v: boolean) => void;
  accentColor: string;
  onReloadPlugins?: () => Promise<void>;
  onNavigateToPluginSettings?: (pluginId: string) => void;
  language: string;
  t: any;
}

export const PluginsTab: React.FC<PluginsTabProps> = ({
  pluginExecUnrestricted,
  setPluginExecUnrestricted,
  accentColor,
  onReloadPlugins,
  onNavigateToPluginSettings,
  language,
  t,
}) => {
  const [pluginsList, setPluginsList] = useState<PluginItem[]>([]);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [installTab, setInstallTab] = useState<'zip' | 'url'>('zip');
  const [installUrl, setInstallUrl] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installingCatalogId, setInstallingCatalogId] = useState<string | null>(null);
  const [installMsg, setInstallMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Consent Modal
  const [pendingInstall, setPendingInstall] = useState<PendingInstall | null>(null);
  const [isConfirmingInstall, setIsConfirmingInstall] = useState(false);

  const zipInputRef = useRef<HTMLInputElement>(null);

  const loadPlugins = async () => {
    setIsLoadingPlugins(true);
    try {
      const items = await api.getPlugins();
      setPluginsList(items);
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setIsLoadingPlugins(false);
    }
  };

  const loadCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const items = await api.getCatalog();
      setCatalogItems(items);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadPlugins();
    loadCatalog();
  }, []);

  const handleTogglePlugin = async (id: string, currentEnabled: boolean) => {
    try {
      await api.togglePlugin(id, !currentEnabled);
      await loadPlugins();
      if (onReloadPlugins) await onReloadPlugins();
    } catch (err: any) {
      alert(`Ошибка переключения плагина: ${err.message}`);
    }
  };

  const handleDeletePlugin = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить плагин "${name}"?`)) return;
    try {
      await api.deletePlugin(id);
      await loadPlugins();
      if (onReloadPlugins) await onReloadPlugins();
    } catch (err: any) {
      alert(`Ошибка удаления плагина: ${err.message}`);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsInstalling(true);
    setInstallMsg(null);
    try {
      const pending = await api.inspectPluginZip(file);
      setPendingInstall(pending);
    } catch (err: any) {
      setInstallMsg({ text: err.message || 'Ошибка проверки архива плагина', isError: true });
    } finally {
      setIsInstalling(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleInstallFromUrl = async () => {
    if (!installUrl.trim()) return;
    setIsInstalling(true);
    setInstallMsg(null);
    try {
      const pending = await api.inspectPluginUrl(installUrl.trim());
      setPendingInstall(pending);
    } catch (err: any) {
      setInstallMsg({ text: err.message || 'Ошибка проверки плагина по ссылке', isError: true });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleInspectCatalogItem = async (item: CatalogItem) => {
    if (!item.downloadUrl) return;
    setInstallingCatalogId(item.id);
    try {
      const pending = await api.inspectPluginUrl(item.downloadUrl);
      setPendingInstall(pending);
    } catch (err: any) {
      alert(`Ошибка проверки плагина: ${err.message}`);
    } finally {
      setInstallingCatalogId(null);
    }
  };

  const handleConfirmConsent = async () => {
    if (!pendingInstall) return;
    setIsConfirmingInstall(true);
    try {
      await api.confirmPluginInstall(pendingInstall.tempKey);
      setPendingInstall(null);
      setInstallMsg({ text: `Плагин "${pendingInstall.manifest.name}" успешно установлен!` });
      setInstallUrl('');
      await loadPlugins();
      await loadCatalog();
      if (onReloadPlugins) await onReloadPlugins();
    } catch (err: any) {
      alert(`Ошибка подтверждения установки: ${err.message}`);
    } finally {
      setIsConfirmingInstall(false);
    }
  };

  const handleCloseConsent = async () => {
    if (pendingInstall) {
      try {
        await api.cancelPluginInstall(pendingInstall.tempKey);
      } catch {
        // ignore
      }
    }
    setPendingInstall(null);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
      {/* Host Command Execution Security ("I know what I'm doing" mode) */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>{t.unrestrictedMode}</span>
          </label>
          <input
            type="checkbox"
            checked={pluginExecUnrestricted}
            onChange={(e) => setPluginExecUnrestricted(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer accent-amber-500"
          />
        </div>
        <p className="text-[11px] text-gray-300 leading-relaxed">
          {t.unrestrictedHelp}
        </p>
      </div>

      {/* Installed Plugins List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Package size={14} className="text-accent" />
            <span>{t.installedPlugins}</span>
          </label>
          <button
            type="button"
            onClick={loadPlugins}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition cursor-pointer"
            title={t.refreshPluginsList}
          >
            <RefreshCw size={13} className={isLoadingPlugins ? 'animate-spin' : ''} />
          </button>
        </div>

        {pluginsList.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 border border-base-border rounded-2xl bg-black/10 flex flex-col items-center justify-center space-y-1">
            <Package className="w-8 h-8 text-gray-500 mb-1 opacity-60" />
            <span className="font-medium text-gray-300">{t.noInstalledPlugins}</span>
            <span className="text-[11px] text-gray-500">
              {t.installHelpNote}
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pluginsList.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl border border-base-border bg-gray-50/50 dark:bg-black/20 flex items-start justify-between gap-3 hover:border-gray-500/30 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-gray-900 dark:text-white">
                      {getPluginName(p, language)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-border text-gray-400 font-mono">
                      v{p.version}
                    </span>
                    {p.builtin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
                        {t.builtin}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {getPluginDescription(p, language)}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {p.author && (
                      <span className="text-[10px] text-gray-400">
                        {t.author}: {p.author}
                      </span>
                    )}
                    {p.fileMatches && p.fileMatches.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-gray-300 font-mono">
                        {p.fileMatches.join(', ')}
                      </span>
                    )}
                    {p.permissions && p.permissions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {p.permissions.map((perm) => {
                          const isCritical = perm.includes('exec') || perm.includes('secrets') || perm === '*';
                          const isService = perm.startsWith('service:') || perm.startsWith('service.');
                          const isKnown =
                            isCritical ||
                            isService ||
                            ['fs.read', 'fs.write', 'network', 'network.bind', 'contextmenu', 'toolbar'].includes(perm.toLowerCase()) ||
                            perm.toLowerCase().startsWith('ui.') ||
                            perm.toLowerCase().startsWith('ui:');
                          const isUnknown = !isKnown;

                          return (
                            <span
                              key={perm}
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                isCritical || isUnknown
                                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                  : isService
                                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                  : 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                              }`}
                              title={isUnknown ? 'Неизвестное разрешение вне спецификации' : undefined}
                            >
                              {isUnknown ? `⚠️ ${perm}` : perm}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {p.providesServices && p.providesServices.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {p.providesServices.map((svc) => (
                          <span
                            key={svc}
                            className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-teal-500/15 text-teal-300 border border-teal-500/25"
                            title={`Provides inter-plugin service '${svc}'`}
                          >
                            ⚡ {svc}
                          </span>
                        ))}
                      </div>
                    )}

                    {p.dependencies && Object.keys(p.dependencies).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {Object.entries(p.dependencies).map(([depId, ver]) => (
                          <span
                            key={depId}
                            className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20"
                            title={`Requires plugin '${depId}'`}
                          >
                            📦 {depId} {ver ? `(${ver})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {p.dependents && p.dependents.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                          title="Active plugins that depend on this plugin"
                        >
                          🔗 {language === 'en' ? 'Used by:' : 'Используется:'} {p.dependents.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-2 shrink-0 pt-0.5">
                  {onNavigateToPluginSettings && (
                    <button
                      type="button"
                      onClick={() => onNavigateToPluginSettings(p.id)}
                      className="p-1.5 text-gray-400 hover:text-accent hover:bg-white/5 rounded-lg transition cursor-pointer"
                      title={language === 'en' ? 'Plugin settings' : 'Настройки плагина'}
                    >
                      <SettingsIcon size={14} />
                    </button>
                  )}

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.enabled}
                      onClick={() => handleTogglePlugin(p.id, p.enabled)}
                      title={p.enabled ? t.pluginEnabled : t.pluginDisabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                        p.enabled
                          ? 'border-transparent shadow-xs'
                          : 'border-gray-500/70 bg-gray-700/60 dark:bg-black/40'
                      }`}
                      style={{
                        backgroundColor: p.enabled ? accentColor : undefined,
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          p.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[10px] font-medium transition-colors ${
                        p.enabled ? 'text-gray-200' : 'text-gray-500'
                      }`}
                    >
                      {p.enabled ? t.pluginEnabled : t.pluginDisabled}
                    </span>
                  </div>

                  {!p.builtin && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlugin(p.id, p.name)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                      title={t.deletePluginTitle}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official & Remote Plugins Catalog */}
      <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <Sparkles size={14} className="text-accent" />
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {t.catalogTitle}
              </label>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {t.catalogSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={loadCatalog}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition cursor-pointer"
            title={t.refreshCatalogTooltip}
          >
            <RefreshCw size={13} className={isLoadingCatalog ? 'animate-spin' : ''} />
          </button>
        </div>

        {catalogItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">
            {isLoadingCatalog ? t.catalogLoading : t.catalogEmpty}
          </div>
        ) : (
          <div className="space-y-2">
            {catalogItems.map((catItem) => {
              const isInstalled = pluginsList.some((p) => p.id === catItem.id);
              const isInstallingThis = installingCatalogId === catItem.id;

              return (
                <div
                  key={catItem.id}
                  className="p-3 rounded-xl border border-base-border bg-black/10 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white">
                        {catItem.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-border text-gray-400 font-mono">
                        v{catItem.version}
                      </span>
                      {catItem.official && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-medium">
                          {t.catalogOfficialBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {catItem.description}
                    </p>
                  </div>

                  <div>
                    {isInstalled ? (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                        <CheckCircle2 size={13} />
                        <span>{t.catalogInstalled}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInspectCatalogItem(catItem)}
                        disabled={isInstallingThis || isInstalling}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download size={13} />
                        <span>{isInstallingThis ? t.installing : t.installCatalogBtn}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Install New Plugin Section (Zip vs URL) */}
      <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t.installPlugin}
        </label>

        <div className="flex space-x-1 p-1 bg-black/20 rounded-xl border border-base-border">
          <button
            type="button"
            onClick={() => setInstallTab('zip')}
            className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              installTab === 'zip'
                ? 'bg-base-surface text-accent shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileArchive size={13} />
            <span>{t.installZipTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setInstallTab('url')}
            className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              installTab === 'url'
                ? 'bg-base-surface text-accent shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Link2 size={13} />
            <span>{t.installUrlTab}</span>
          </button>
        </div>

        {/* Method 1: Zip/CSPKG file dropzone */}
        {installTab === 'zip' && (
          <div>
            <input
              type="file"
              ref={zipInputRef}
              onChange={handleZipUpload}
              accept=".zip,.cspkg"
              className="hidden"
            />
            <div
              onClick={() => zipInputRef.current?.click()}
              className="border-2 border-dashed border-base-border hover:border-accent p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition bg-black/10 hover:bg-accent/5 group"
            >
              <Upload size={22} className="text-gray-400 group-hover:text-accent mb-1 transition" />
              <span className="text-xs font-medium text-gray-200">
                {t.dropZipHere}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5">
                {t.orClickToUploadZip}
              </span>
            </div>
          </div>
        )}

        {/* Method 2: URL / GitHub input */}
        {installTab === 'url' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={installUrl}
                onChange={(e) => setInstallUrl(e.target.value)}
                placeholder={t.pluginUrlPlaceholder}
                className="flex-1 px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleInstallFromUrl}
                disabled={isInstalling || !installUrl.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-900 bg-accent hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {isInstalling ? t.installing : t.installBtn}
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              {t.githubUrlTip}
            </p>
          </div>
        )}

        {/* Method 3: Hint on direct placement */}
        <div className="flex items-start space-x-2 pt-2 border-t border-base-border text-[11px] text-gray-400">
          <FolderOpen size={14} className="mt-0.5 shrink-0 text-accent" />
          <span>{t.directPlacementTip}</span>
        </div>

        {/* Feedback message */}
        {installMsg && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
              installMsg.isError
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {installMsg.isError ? <AlertTriangle size={14} /> : <Check size={14} />}
            <span>{installMsg.text}</span>
          </div>
        )}
      </div>

      <PluginConsentModal
        isOpen={!!pendingInstall}
        pending={pendingInstall}
        onClose={handleCloseConsent}
        onConfirm={handleConfirmConsent}
        isConfirming={isConfirmingInstall}
        language={language}
      />
    </div>
  );
};
