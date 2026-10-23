import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Globe,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import { PluginSource, ProfilePreview } from '../../../types';
import { api } from '../../../services/api';
import { ProfileImportModal } from '../../ProfileImportModal';

interface ProfileTabProps {
  onReloadSettings?: () => Promise<void>;
  onReloadPlugins?: () => Promise<void>;
  language: string;
  t: any;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  onReloadSettings,
  onReloadPlugins,
  language,
  t,
}) => {
  const [sources, setSources] = useState<PluginSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isSyncingSources, setIsSyncingSources] = useState(false);

  const [showAddSourceForm, setShowAddSourceForm] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Profile Import Preview Modal
  const [isProfileImportModalOpen, setIsProfileImportModalOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState<ProfilePreview | null>(null);
  const [isImportingProfile, setIsImportingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const loadSources = async () => {
    setIsLoadingSources(true);
    try {
      const data = await api.getSources();
      setSources(data);
    } catch (err) {
      console.error('Failed to load plugin sources:', err);
    } finally {
      setIsLoadingSources(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSyncSources = async () => {
    setIsSyncingSources(true);
    try {
      await api.syncSources();
      await loadSources();
      if (onReloadPlugins) await onReloadPlugins();
    } catch (err: any) {
      alert(`Ошибка синхронизации каталогов: ${err.message}`);
    } finally {
      setIsSyncingSources(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceUrl.trim()) return;
    setIsAddingSource(true);
    try {
      await api.addSource({
        name: newSourceName.trim() || 'Custom Catalog',
        url: newSourceUrl.trim(),
      });
      setNewSourceName('');
      setNewSourceUrl('');
      setShowAddSourceForm(false);
      await loadSources();
    } catch (err: any) {
      alert(`Ошибка добавления источника: ${err.message}`);
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleToggleSource = async (source: PluginSource) => {
    try {
      await api.updateSource(source.id, { enabled: !source.enabled });
      await loadSources();
    } catch (err: any) {
      alert(`Ошибка обновления источника: ${err.message}`);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот источник плагинов?')) return;
    try {
      await api.deleteSource(id);
      await loadSources();
    } catch (err: any) {
      alert(`Ошибка удаления источника: ${err.message}`);
    }
  };

  const handleProfileFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      const text = await file.text();
      const preview = await api.previewProfile(text);
      setProfilePreview(preview);
      setIsProfileImportModalOpen(true);
    } catch (err: any) {
      alert(`Ошибка чтения профиля: ${err.message}`);
    } finally {
      if (profileFileInputRef.current) profileFileInputRef.current.value = '';
    }
  };

  const handleConfirmImportProfile = async (options: {
    applySettings: boolean;
    importSources: boolean;
    autoInstallPlugins: boolean;
  }) => {
    if (!profilePreview) return;
    setIsImportingProfile(true);
    try {
      const res = await api.importProfile({
        profile: profilePreview.profile,
        ...options,
      });

      setIsProfileImportModalOpen(false);
      setProfilePreview(null);

      let msg = 'Профиль успешно импортирован!\n';
      if (res.settingsApplied) msg += '• Настройки внешнего вида применены.\n';
      if (res.sourcesAdded > 0) msg += `• Добавлено новых источников: ${res.sourcesAdded}\n`;
      if (res.pluginsQueued.length > 0) msg += `• Установлено плагинов: ${res.pluginsQueued.length}\n`;
      if (res.pluginsEnabled && res.pluginsEnabled.length > 0) msg += `• Включено плагинов: ${res.pluginsEnabled.length}\n`;
      if (res.errors && res.errors.length > 0) {
        msg += `\nПредупреждения:\n${res.errors.join('\n')}`;
      }
      alert(msg);

      if (onReloadSettings) await onReloadSettings();
      if (onReloadPlugins) await onReloadPlugins();
      await loadSources();
    } catch (err: any) {
      alert(`Ошибка импорта профиля: ${err.message}`);
    } finally {
      setIsImportingProfile(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      {/* Card 1: 1-Click Profile Portability */}
      <div className="p-5 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {t.profilePortabilityTitle}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.profilePortabilityDesc}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href={api.getProfileExportUrl()}
            download="config-studio-profile.json"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-gray-900 hover:opacity-90 shadow-sm transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>{t.exportProfileBtn}</span>
          </a>

          <input
            type="file"
            ref={profileFileInputRef}
            onChange={handleProfileFileSelect}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => profileFileInputRef.current?.click()}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200/80 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 border border-base-border transition-all cursor-pointer"
          >
            <Upload size={14} />
            <span>{t.importProfileBtn}</span>
          </button>

          <span className="text-[11px] text-teal-400/90 font-medium flex items-center gap-1.5 ml-auto">
            <Sparkles size={12} />
            {t.secretsExcludedNote}
          </span>
        </div>
      </div>

      {/* Card 2: Trusted Plugin Sources & Repositories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe size={16} className="text-accent" />
              <span>{t.sourcesTitle}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.sourcesDesc}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSyncSources}
              disabled={isSyncingSources}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-200/80 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 border border-base-border text-gray-700 dark:text-gray-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncingSources ? 'animate-spin' : ''} />
              <span>{isSyncingSources ? t.syncingSources : t.syncSources}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddSourceForm(!showAddSourceForm)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent text-gray-900 hover:opacity-90 shadow-2xs transition-all cursor-pointer"
            >
              <Plus size={12} />
              <span>{t.addSourceBtn}</span>
            </button>
          </div>
        </div>

        {/* Add Source Inline Form */}
        {showAddSourceForm && (
          <div className="p-4 rounded-2xl border border-accent/40 bg-accent/5 space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              {t.addSourceTitle}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {t.sourceNameLabel}
                </label>
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder={t.sourceNamePlaceholder}
                  className="w-full px-3 py-1.5 rounded-xl border border-base-border bg-base-surface text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {t.sourceUrlLabel}
                </label>
                <input
                  type="text"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/.../registry.json"
                  className="w-full px-3 py-1.5 rounded-xl border border-base-border bg-base-surface text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddSourceForm(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleAddSource}
                disabled={!newSourceUrl.trim() || isAddingSource}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-accent text-gray-900 hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isAddingSource ? t.addingSource : t.saveSourceBtn}
              </button>
            </div>
          </div>
        )}

        {/* Sources List */}
        <div className="space-y-2">
          {isLoadingSources ? (
            <div className="py-8 text-center text-xs text-gray-400">
              {t.loadingSources}
            </div>
          ) : sources.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              {t.noSources}
            </div>
          ) : (
            sources.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl border border-base-border bg-gray-50 dark:bg-black/20 flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={() => handleToggleSource(s)}
                    className="w-4 h-4 text-accent rounded accent-teal-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {s.name}
                      </span>
                      {s.official ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/40">
                          {t.officialBadge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">
                          {t.communityBadge}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 font-mono">
                        ({s.pluginsCount} {t.pluginsCountSuffix})
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono truncate mt-0.5 max-w-xl">
                      {s.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {s.lastSync && (
                    <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
                      {t.syncedPrefix} {new Date(s.lastSync).toLocaleTimeString(language === 'en' ? 'en-US' : 'ru-RU')}
                    </span>
                  )}
                  {!s.official && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSource(s.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title={t.deleteSourceTitle}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ProfileImportModal
        isOpen={isProfileImportModalOpen}
        preview={profilePreview}
        isImporting={isImportingProfile}
        language={language}
        onClose={() => {
          setIsProfileImportModalOpen(false);
          setProfilePreview(null);
        }}
        onConfirm={handleConfirmImportProfile}
      />
    </div>
  );
};
