import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Shield,
  Key,
  Package,
  Sliders,
  Share2,
  ScrollText,
  RotateCcw,
  Check,
} from 'lucide-react';
import { translations, getAvailableLanguages, subscribeLanguages, LanguageMeta } from '../../utils/i18n';
import { SettingsModalProps, SettingsTab } from './types';
import { GeneralTab } from './tabs/GeneralTab';
import { SecurityTab } from './tabs/SecurityTab';
import { SecretsTab } from './tabs/SecretsTab';
import { PluginsTab } from './tabs/PluginsTab';
import { PluginSettingsTab } from './tabs/PluginSettingsTab';
import { ProfileTab } from './tabs/ProfileTab';
import { AuditTab } from './tabs/AuditTab';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onReloadSettings,
  onReloadPlugins,
  onUploadIcon,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [selectedPluginIdForSettings, setSelectedPluginIdForSettings] = useState<string | null>(null);

  // App settings state
  const [title, setTitle] = useState(settings.appTitle || 'Config Studio');
  const [baseColor, setBaseColor] = useState(settings.baseColor || '#161b22');
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#00d2b4');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(settings.themeMode || 'dark');
  const [language, setLanguage] = useState(settings.language || 'ru');
  const [bottomDockMode, setBottomDockMode] = useState<'auto' | 'always' | 'hidden'>(
    settings.bottomDockMode || 'auto'
  );

  // Security state
  const [authEnabled, setAuthEnabled] = useState(settings.authEnabled || false);
  const [authUser, setAuthUser] = useState(settings.authUser || '');
  const [authPass, setAuthPass] = useState('');
  const [apiEnabled, setApiEnabled] = useState(settings.apiEnabled !== false);
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [structureGuardEnabled, setStructureGuardEnabled] = useState(
    settings.structureGuardEnabled !== false
  );
  const [criticalPatterns, setCriticalPatterns] = useState(
    (settings.criticalPatterns || []).join('\n')
  );

  // Plugins unrestricted mode
  const [pluginExecUnrestricted, setPluginExecUnrestricted] = useState(
    settings.pluginExecUnrestricted || false
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageMeta[]>(getAvailableLanguages());

  useEffect(() => {
    return subscribeLanguages(() => {
      setAvailableLanguages(getAvailableLanguages());
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(settings.appTitle || 'Config Studio');
      setBaseColor(settings.baseColor || '#161b22');
      setAccentColor(settings.accentColor || '#00d2b4');
      setThemeMode(settings.themeMode || 'dark');
      setLanguage(settings.language || 'ru');
      setBottomDockMode(settings.bottomDockMode || 'auto');
      setAuthEnabled(settings.authEnabled || false);
      setAuthUser(settings.authUser || '');
      setAuthPass('');
      setApiEnabled(settings.apiEnabled !== false);
      setApiKey(settings.apiKey || '');
      setStructureGuardEnabled(settings.structureGuardEnabled !== false);
      setCriticalPatterns((settings.criticalPatterns || []).join('\n'));
      setPluginExecUnrestricted(settings.pluginExecUnrestricted || false);
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, settings, initialTab]);

  if (!isOpen) return null;

  const t = translations[language] || translations.ru;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const parsedPatterns = criticalPatterns
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      await onSaveSettings({
        appTitle: title.trim() || 'Config Studio',
        baseColor,
        accentColor,
        themeMode,
        language,
        bottomDockMode,
        authEnabled,
        authUser: authUser.trim(),
        authPass: authPass || undefined,
        apiEnabled,
        apiKey,
        structureGuardEnabled,
        criticalPatterns: parsedPatterns,
        pluginExecUnrestricted,
      });
      onClose();
    } catch (err: any) {
      alert(`Ошибка сохранения настроек: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm(t.confirmResetSettings)) return;
    setTitle('Config Studio');
    setBaseColor('#161b22');
    setAccentColor('#00d2b4');
    setThemeMode('dark');
    setLanguage('ru');
    setBottomDockMode('auto');
    setStructureGuardEnabled(true);
    setCriticalPatterns('');
    setPluginExecUnrestricted(false);
  };

  const navItems = [
    { id: 'general', label: t.tabGeneral, icon: Palette },
    { id: 'security', label: t.tabSecurity, icon: Shield },
    { id: 'secrets', label: t.tabSecrets, icon: Key },
    { id: 'plugins', label: t.tabPlugins, icon: Package },
    { id: 'plugin-settings', label: t.tabPluginSettings, icon: Sliders },
    { id: 'profile', label: t.tabProfile, icon: Share2 },
    { id: 'audit', label: t.tabAudit, icon: ScrollText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-base-surface border border-base-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ ['--color-accent' as any]: accentColor }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {t.settings}
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold font-mono">
              v1.9.6
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex px-6 border-b border-base-border bg-gray-50/50 dark:bg-black/10 overflow-x-auto gap-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SettingsTab)}
                style={{
                  color: isSelected ? accentColor : undefined,
                  borderBottomColor: isSelected ? accentColor : 'transparent',
                }}
                className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'border-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === 'general' && (
            <GeneralTab
              settings={settings}
              title={title}
              setTitle={setTitle}
              baseColor={baseColor}
              setBaseColor={setBaseColor}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              bottomDockMode={bottomDockMode}
              setBottomDockMode={setBottomDockMode}
              onUploadIcon={onUploadIcon}
              availableLanguages={availableLanguages}
              t={t}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              authEnabled={authEnabled}
              setAuthEnabled={setAuthEnabled}
              authUser={authUser}
              setAuthUser={setAuthUser}
              authPass={authPass}
              setAuthPass={setAuthPass}
              apiEnabled={apiEnabled}
              setApiEnabled={setApiEnabled}
              apiKey={apiKey}
              setApiKey={setApiKey}
              structureGuardEnabled={structureGuardEnabled}
              setStructureGuardEnabled={setStructureGuardEnabled}
              criticalPatterns={criticalPatterns}
              setCriticalPatterns={setCriticalPatterns}
              t={t}
            />
          )}

          {activeTab === 'secrets' && (
            <SecretsTab
              authEnabled={authEnabled}
              onNavigateToSecurity={() => setActiveTab('security')}
              language={language}
              t={t}
            />
          )}

          {activeTab === 'plugins' && (
            <PluginsTab
              pluginExecUnrestricted={pluginExecUnrestricted}
              setPluginExecUnrestricted={setPluginExecUnrestricted}
              accentColor={accentColor}
              onReloadPlugins={onReloadPlugins}
              onNavigateToPluginSettings={(pluginId) => {
                setSelectedPluginIdForSettings(pluginId);
                setActiveTab('plugin-settings');
              }}
              language={language}
              t={t}
            />
          )}

          {activeTab === 'plugin-settings' && (
            <PluginSettingsTab
              initialPluginId={selectedPluginIdForSettings}
              accentColor={accentColor}
              language={language}
              t={t}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              onReloadSettings={onReloadSettings}
              onReloadPlugins={onReloadPlugins}
              language={language}
              t={t}
            />
          )}

          {activeTab === 'audit' && <AuditTab t={t} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base-border flex items-center justify-between bg-gray-50 dark:bg-black/20">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDefaults}</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-900 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
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
