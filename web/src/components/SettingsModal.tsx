import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { Settings } from '../types';
import { translations, Language } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (newSettings: Partial<Settings>) => Promise<void>;
  onUploadIcon: (file: File) => Promise<void>;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onUploadIcon,
}) => {
  const [title, setTitle] = useState(settings.appTitle);
  const [baseColor, setBaseColor] = useState(settings.baseColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [themeMode, setThemeMode] = useState(settings.themeMode);
  const [language, setLanguage] = useState<Language>(settings.language || 'ru');
  const [authEnabled, setAuthEnabled] = useState(settings.authEnabled || false);
  const [authUser, setAuthUser] = useState(settings.authUser || 'admin');
  const [authPass, setAuthPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const t = translations[language] || translations.ru;

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      if (selectedFile) {
        await onUploadIcon(selectedFile);
      }
      const payload: Partial<Settings> = {
        appTitle: title.trim() || 'Config Studio',
        baseColor,
        accentColor,
        themeMode,
        language,
        authEnabled,
        authUser: authUser.trim() || 'admin',
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-lg bg-base-surface border border-base-border rounded-3xl shadow-2xl overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Palette className="w-5 h-5 text-accent" />
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

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
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
              placeholder="e.g. Config Studio or YAML Studio"
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
                  <img
                    src={iconPreview}
                    alt="Preview"
                    className="w-full h-full object-contain p-1"
                  />
                ) : settings.hasCustomIcon ? (
                  <img
                    src={`/api/branding/icon?t=${Date.now()}`}
                    alt="Current Icon"
                    className="w-full h-full object-contain p-1"
                  />
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

          {/* Base Color (Background & Surfaces) */}
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

          {/* Security / Authentication */}
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
        </div>

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
