import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Palette,
  Type,
  Image as ImageIcon,
  Check,
  Upload,
  RotateCcw,
  Globe,
  Shield,
  Sun,
  Moon,
  Cpu,
  Copy,
  Key,
  Package,
  Trash2,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Link2,
  FileArchive,
  Terminal,
  ShieldAlert,
  Sparkles,
  Download,
} from 'lucide-react';
import { Settings, PluginItem } from '../types';
import { translations, Language } from '../utils/i18n';
import { copyToClipboard } from '../utils/color';
import { api } from '../services/api';
import { pluginManager } from '../services/pluginLoader';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (newSettings: Partial<Settings>) => Promise<void>;
  onUploadIcon: (file: File) => Promise<void>;
  initialTab?: SettingsTab;
}

const PRESET_BASE_COLORS = [
  { name: 'Dark Slate', hex: '#161b22' },
  { name: 'Deep Charcoal', hex: '#121212' },
  { name: 'Navy Midnight', hex: '#0f172a' },
  { name: 'Material Dark', hex: '#1e1e2e' },
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Light Surface', hex: '#f8fafc' },
];

const PRESET_ACCENT_COLORS = [
  { name: 'Teal (Default)', hex: '#00d2b4' },
  { name: 'Material Blue', hex: '#38bdf8' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Purple Neon', hex: '#a855f7' },
  { name: 'Coral Rose', hex: '#f43f5e' },
];

interface CatalogPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  repoUrl: string;
  tags: string[];
}

const OFFICIAL_CATALOG: CatalogPlugin[] = [
  {
    id: 'web-devkit',
    name: 'Web DevKit',
    version: '1.1.0',
    description: 'Живой Split-Screen предпросмотр HTML/PHP, симуляция экранов устройств, веб-сервер :8085 и автодополнение Monaco.',
    icon: '🌐',
    repoUrl: 'https://github.com/EdvardBaldanov/config-studio-web-devkit',
    tags: ['HTML', 'PHP', 'Live Preview', 'Server'],
  },
  {
    id: 'remote-agent',
    name: 'Remote Server Agent',
    version: '1.1.0',
    description: 'Управление парком удаленных серверов (VPS, хосты) и мгновенное переключение между ними из шапки редактора.',
    icon: '🖥️',
    repoUrl: 'https://github.com/EdvardBaldanov/config-studio-remote-agent',
    tags: ['Multi-Server', 'VPS', 'Agent', 'Remote'],
  },
];

type SettingsTab = 'general' | 'security' | 'plugins';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onUploadIcon,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // General Settings
  const [title, setTitle] = useState(settings.appTitle);
  const [baseColor, setBaseColor] = useState(settings.baseColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [themeMode, setThemeMode] = useState(settings.themeMode);
  const [language, setLanguage] = useState<Language>(settings.language || 'ru');

  // Security Settings
  const [authEnabled, setAuthEnabled] = useState(settings.authEnabled || false);
  const [authUser, setAuthUser] = useState(settings.authUser || 'admin');
  const [authPass, setAuthPass] = useState('');
  const [apiEnabled, setApiEnabled] = useState(settings.apiEnabled || false);
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [copiedKey, setCopiedKey] = useState(false);

  // Plugins & Host Exec Mode
  const [pluginExecUnrestricted, setPluginExecUnrestricted] = useState(
    settings.pluginExecUnrestricted || false
  );
  const [pluginsList, setPluginsList] = useState<PluginItem[]>([]);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
  const [installTab, setInstallTab] = useState<'zip' | 'url'>('zip');
  const [installUrl, setInstallUrl] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const t = translations[language] || translations.ru;

  useEffect(() => {
    if (isOpen) {
      loadPlugins();
    }
  }, [isOpen]);

  const loadPlugins = async () => {
    setIsLoadingPlugins(true);
    try {
      const items = await api.getPlugins();
      setPluginsList(items);
    } catch (e) {
      console.error('Failed to load plugins:', e);
    } finally {
      setIsLoadingPlugins(false);
    }
  };

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsInstalling(true);
    setInstallMsg(null);
    try {
      const installed = await api.uploadPluginZip(file);
      setInstallMsg({
        text: `Плагин "${installed.name}" успешно установлен!`,
        isError: false,
      });
      await loadPlugins();
      await pluginManager.loadPlugins();
    } catch (err: any) {
      setInstallMsg({ text: err.message || 'Ошибка загрузки плагина', isError: true });
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
      const installed = await api.installPluginUrl(installUrl.trim());
      setInstallMsg({
        text: `Плагин "${installed.name}" успешно установлен из URL!`,
        isError: false,
      });
      setInstallUrl('');
      await loadPlugins();
      await pluginManager.loadPlugins();
    } catch (err: any) {
      setInstallMsg({ text: err.message || 'Ошибка установки по ссылке', isError: true });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleInstallCatalogPlugin = async (p: CatalogPlugin) => {
    setIsInstalling(true);
    setInstallMsg(null);
    try {
      const installed = await api.installPluginUrl(p.repoUrl);
      setInstallMsg({
        text: `Плагин "${installed.name}" успешно установлен!`,
        isError: false,
      });
      await loadPlugins();
      await pluginManager.loadPlugins();
    } catch (err: any) {
      setInstallMsg({ text: err.message || `Ошибка установки ${p.name}`, isError: true });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleTogglePlugin = async (id: string, currentEnabled: boolean) => {
    try {
      await api.togglePlugin(id, !currentEnabled);
      if (currentEnabled) {
        pluginManager.removePluginAssets(id);
      } else {
        await pluginManager.loadPlugins();
      }
      await loadPlugins();
    } catch (err: any) {
      alert(`Ошибка переключения плагина: ${err.message}`);
    }
  };

  const handleDeletePlugin = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить плагин "${name}"?`)) return;
    try {
      await api.deletePlugin(id);
      pluginManager.removePluginAssets(id);
      await loadPlugins();
    } catch (err: any) {
      alert(`Ошибка удаления плагина: ${err.message}`);
    }
  };

  const generateRandomKey = () => {
    const chars = 'abcdef0123456789';
    let key = 'cs_live_';
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    setApiKey(key);
  };

  const handleCopyKey = async () => {
    if (!apiKey) return;
    const ok = await copyToClipboard(apiKey);
    if (ok) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      if (selectedFile) {
        await onUploadIcon(selectedFile);
      }
      const activeKey = apiEnabled
        ? apiKey ||
          'cs_live_' +
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        : '';
      const payload: Partial<Settings> = {
        appTitle: title.trim() || 'Config Studio',
        baseColor,
        accentColor,
        themeMode,
        language,
        authEnabled,
        authUser: authUser.trim() || 'admin',
        apiEnabled,
        apiKey: activeKey,
        pluginExecUnrestricted,
      };
      if (authPass) {
        payload.authPass = authPass;
      }
      await onSaveSettings(payload);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDefaults = () => {
    setTitle('Config Studio');
    setBaseColor('#161b22');
    setAccentColor('#00d2b4');
    setThemeMode('dark');
    setLanguage('ru');
    setAuthEnabled(false);
    setApiEnabled(false);
    setApiKey('');
    setPluginExecUnrestricted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-xl bg-base-surface border border-base-border rounded-3xl shadow-2xl overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
        {/* Header & Tabs */}
        <div className="px-6 pt-5 pb-3 border-b border-base-border bg-base/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-gray-900 shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                <Palette size={16} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t.settingsTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 p-1 bg-gray-100 dark:bg-black/30 rounded-xl border border-base-border">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'general'
                  ? 'bg-base-surface text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Palette size={13} />
              <span>{t.tabGeneral}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'security'
                  ? 'bg-base-surface text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Shield size={13} />
              <span>{t.tabSecurity}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('plugins')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all relative ${
                activeTab === 'plugins'
                  ? 'bg-base-surface text-accent shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Package size={13} />
              <span>{t.tabPlugins}</span>
              {pluginsList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-accent/20 text-accent text-[10px] rounded-full font-bold ml-1">
                  {pluginsList.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: General & Appearance */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* App Title */}
            <div>
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                <Type className="w-4 h-4 text-accent" />
                <span>{t.appTitle}</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Config Studio"
                className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/15 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                {t.appTitleHelp}
              </p>
            </div>

            {/* Language Selector */}
            <div>
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                <Globe className="w-4 h-4 text-accent" />
                <span>{t.language}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage('ru')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                    language === 'ru'
                      ? 'border-accent bg-accent/15 text-accent shadow-sm'
                      : 'border-base-border bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>🇷🇺 Русский</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                    language === 'en'
                      ? 'border-accent bg-accent/15 text-accent shadow-sm'
                      : 'border-base-border bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>🇬🇧 English</span>
                </button>
              </div>
            </div>

            {/* Theme Mode Switch */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {t.theme}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                    themeMode === 'dark'
                      ? 'border-accent bg-accent/15 text-accent shadow-sm'
                      : 'border-base-border bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>{t.themeDark}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                    themeMode === 'light'
                      ? 'border-accent bg-accent/15 text-accent shadow-sm'
                      : 'border-base-border bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>{t.themeLight}</span>
                </button>
              </div>
            </div>

            {/* Custom Icon & Favicon Upload */}
            <div>
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                <ImageIcon className="w-4 h-4 text-accent" />
                <span>{t.appIcon}</span>
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl border border-base-border bg-gray-100 dark:bg-black/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {iconPreview ? (
                    <img src={iconPreview} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : settings.hasCustomIcon ? (
                    <img src={`/api/branding/icon?t=${Date.now()}`} alt="Current Icon" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-slate-900 shadow-sm"
                      style={{ backgroundColor: accentColor }}
                    >
                      {title.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".png,.svg,.ico,.jpg,.webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-800 dark:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-base-border transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-accent" />
                    <span>{t.chooseImage}</span>
                  </button>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    {t.appIconHelp}
                  </p>
                </div>
              </div>
            </div>

            {/* Base Color */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {t.baseColor}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_BASE_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setBaseColor(preset.hex)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${
                      baseColor.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-accent text-accent font-semibold shadow-xs'
                        : 'border-base-border text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-gray-400/30"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-28 px-2.5 py-1 bg-gray-100 dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {t.accentColor}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_ACCENT_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setAccentColor(preset.hex)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${
                      accentColor.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-accent text-accent font-semibold shadow-xs'
                        : 'border-base-border text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-gray-400/30"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-28 px-2.5 py-1 bg-gray-100 dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Security & API */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* Direct Authentication */}
            <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-accent" />
                  <span>{t.authSettings}</span>
                </label>
                <input
                  type="checkbox"
                  checked={authEnabled}
                  onChange={(e) => setAuthEnabled(e.target.checked)}
                  className="w-4 h-4 text-accent rounded cursor-pointer accent-teal-500"
                />
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {t.authHelp}
              </p>

              {authEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.username}
                    </label>
                    <input
                      type="text"
                      value={authUser}
                      onChange={(e) => setAuthUser(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.newPassword}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* REST API Access Setting */}
            <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-accent" />
                  <span>{t.enableApi}</span>
                </label>
                <input
                  type="checkbox"
                  checked={apiEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setApiEnabled(val);
                    if (val && !apiKey) {
                      generateRandomKey();
                    }
                  }}
                  className="w-4 h-4 text-accent rounded cursor-pointer accent-teal-500"
                />
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {t.enableApiHelp}
              </p>

              {apiEnabled ? (
                <div className="space-y-2 pt-2 border-t border-base-border">
                  <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
                    {t.apiKey}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={apiKey}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="px-2.5 py-1.5 rounded-xl border border-base-border hover:border-accent text-xs flex items-center space-x-1 bg-white dark:bg-white/5"
                      title="Copy API Key"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? t.copied : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={generateRandomKey}
                      className="px-2.5 py-1.5 rounded-xl border border-base-border hover:border-accent text-xs flex items-center space-x-1 bg-white dark:bg-white/5"
                      title={t.generateApiKey}
                    >
                      <Key className="w-3.5 h-3.5 text-accent" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono">
                    curl -H "X-API-Key: {apiKey ? apiKey.substring(0, 10) + '...' : 'YOUR_KEY'}" http://&lt;host&gt;:8080/api/fs/tree
                  </p>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.apiDisabledNote}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Plugins System */}
        {activeTab === 'plugins' && (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
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
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition"
                  title="Обновить список плагинов"
                >
                  <RefreshCw size={13} className={isLoadingPlugins ? 'animate-spin' : ''} />
                </button>
              </div>

              {pluginsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 border border-base-border rounded-2xl bg-black/10 flex flex-col items-center justify-center space-y-1">
                  <Package className="w-8 h-8 text-gray-500 mb-1 opacity-60" />
                  <span className="font-medium text-gray-300">{t.noInstalledPlugins}</span>
                  <span className="text-[11px] text-gray-500">
                    Установите нужные модули из каталога ниже, через ZIP или по ссылке из GitHub.
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
                            {p.name}
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
                          {p.description}
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
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center space-x-2 shrink-0 pt-0.5">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={p.enabled}
                            onChange={() => handleTogglePlugin(p.id, p.enabled)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent" />
                        </label>

                        {!p.builtin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlugin(p.id, p.name)}
                            className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                            title="Удалить плагин"
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

            {/* Official Plugins Catalog */}
            <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
              <div>
                <div className="flex items-center space-x-1.5 mb-1">
                  <Sparkles size={14} className="text-accent" />
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.catalogTitle}
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t.catalogDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {OFFICIAL_CATALOG.map((item) => {
                  const isInstalled = pluginsList.some((p) => p.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-base-border bg-white dark:bg-white/5 flex items-start justify-between gap-3 hover:border-gray-500/30 transition shadow-2xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{item.icon}</span>
                          <span className="font-semibold text-xs text-gray-900 dark:text-white">
                            {item.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-border text-gray-400 font-mono">
                            v{item.version}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          {item.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 dark:bg-black/40 text-gray-600 dark:text-gray-400 font-mono"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {isInstalled ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check size={12} />
                            <span>{t.installedBadge}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInstallCatalogPlugin(item)}
                            disabled={isInstalling}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent hover:opacity-90 text-gray-900 transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                          >
                            <Download size={13} />
                            <span>{isInstalling ? t.installing : t.installCatalogBtn}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Install New Plugin Section (3 methods) */}
            <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {t.installPlugin}
              </label>

              {/* Install Sub-tabs: Zip vs URL */}
              <div className="flex space-x-1 p-1 bg-black/20 rounded-xl border border-base-border">
                <button
                  type="button"
                  onClick={() => setInstallTab('zip')}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition ${
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
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition ${
                    installTab === 'url'
                      ? 'bg-base-surface text-accent shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Link2 size={13} />
                  <span>{t.installUrlTab}</span>
                </button>
              </div>

              {/* Method 1: Zip file dropzone / file select */}
              {installTab === 'zip' && (
                <div>
                  <input
                    type="file"
                    ref={zipInputRef}
                    onChange={handleZipUpload}
                    accept=".zip"
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
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-900 bg-accent hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {isInstalling ? t.installing : t.installBtn}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Поддерживаются прямые ссылки на GitHub репозитории (например, https://github.com/author/plugin) или прямые ссылки на .zip файлы.
                  </p>
                </div>
              )}

              {/* Method 3: Hint on direct directory copy */}
              <div className="flex items-start space-x-2 pt-2 border-t border-base-border text-[11px] text-gray-400">
                <FolderOpen size={14} className="mt-0.5 shrink-0 text-accent" />
                <span>{t.directPlacementTip}</span>
              </div>

              {/* Install feedback message */}
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
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base-border flex items-center justify-between bg-gray-50 dark:bg-black/20">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDefaults}</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-900 transition-all shadow-md active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '...' : t.applyChanges}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
