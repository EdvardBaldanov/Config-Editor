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
  ShieldCheck,
  Sparkles,
  Download,
  ScrollText,
  AlertOctagon,
  Info,
  Search,
  Share2,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit3,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import {
  Settings,
  PluginItem,
  AuditEvent,
  PendingInstall,
  PluginSource,
  CatalogItem,
  ProfilePreview,
  SecretMeta,
  SecretItem,
  SecretsStatus,
  SecretType,
  SecretScope,
} from '../types';
import {
  translations,
  Language,
  getAvailableLanguages,
  subscribeLanguages,
  LanguageMeta,
  getPluginName,
  getPluginDescription,
} from '../utils/i18n';
import { copyToClipboard } from '../utils/color';
import { api } from '../services/api';
import { pluginManager } from '../services/pluginLoader';
import { PluginConsentModal } from './PluginConsentModal';
import { ProfileImportModal } from './ProfileImportModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (newSettings: Partial<Settings>) => Promise<void>;
  onReloadSettings?: () => Promise<void>;
  onReloadPlugins?: () => Promise<void>;
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
  locales?: Record<string, { name?: string; description?: string }>;
}

const OFFICIAL_CATALOG: CatalogPlugin[] = [
  {
    id: 'web-devkit',
    name: 'Web DevKit',
    version: '1.2.0',
    description: 'Live Split-Screen preview for HTML/PHP with Chrome browser tab simulation, :8085 server, and AST structure.',
    locales: {
      ru: {
        name: 'Web DevKit',
        description: 'Живой Split-Screen предпросмотр HTML/PHP с симуляцией вкладки Chrome, веб-сервер :8085 и AST-структура.',
      },
      en: {
        name: 'Web DevKit',
        description: 'Live Split-Screen preview for HTML/PHP with Chrome browser tab simulation, :8085 server, and AST structure.',
      },
    },
    icon: '🌐',
    repoUrl: 'https://github.com/EdvardBaldanov/config-studio-web-devkit',
    tags: ['HTML', 'PHP', 'Live Preview', 'Server'],
  },
  {
    id: 'remote-agent',
    name: 'Remote Server Agent',
    version: '1.1.0',
    description: 'Manage and seamlessly switch between remote servers (VPS, host instances) directly from the editor header.',
    locales: {
      ru: {
        name: 'Remote Server Agent',
        description: 'Управление парком удаленных серверов (VPS, хосты) и мгновенное переключение между ними из шапки редактора.',
      },
      en: {
        name: 'Remote Server Agent',
        description: 'Manage and seamlessly switch between remote servers (VPS, host instances) directly from the editor header.',
      },
    },
    icon: '🖥️',
    repoUrl: 'https://github.com/EdvardBaldanov/config-studio-remote-agent',
    tags: ['Multi-Server', 'VPS', 'Agent', 'Remote'],
  },
  {
    id: 'lang-en',
    name: 'English Language Pack',
    version: '1.0.0',
    description: 'Complete English UI localization for Config Studio.',
    locales: {
      ru: {
        name: 'Английский языковой пакет',
        description: 'Полная локализация интерфейса Config Studio на английский язык.',
      },
      en: {
        name: 'English Language Pack',
        description: 'Complete English UI localization for Config Studio.',
      },
    },
    icon: '🇬🇧',
    repoUrl: 'https://github.com/EdvardBaldanov/config-studio-lang-en',
    tags: ['Localization', 'Language', 'English'],
  },
  {
    id: 'lang-ru',
    name: 'Русский языковой пакет',
    version: '1.0.0',
    description: 'Полная русская локализация интерфейса Config Studio.',
    locales: {
      ru: {
        name: 'Русский языковой пакет',
        description: 'Полная русская локализация интерфейса Config Studio.',
      },
      en: {
        name: 'Russian Language Pack',
        description: 'Complete Russian UI localization for Config Studio.',
      },
    },
    icon: '🇷🇺',
    repoUrl: 'https://github.com/EdvardBaldanov/config-studio-lang-ru',
    tags: ['Localization', 'Language', 'Russian'],
  },
  {
    id: 'lang-de',
    name: 'Deutsch Sprachpaket',
    version: '1.0.0',
    description: 'Deutsche Lokalisierung für die gesamte Benutzeroberfläche von Config Studio.',
    locales: {
      ru: {
        name: 'Немецкий языковой пакет',
        description: 'Полная локализация интерфейса Config Studio на немецкий язык (German UI Language Pack).',
      },
      en: {
        name: 'German Language Pack',
        description: 'Complete German UI localization for Config Studio.',
      },
      de: {
        name: 'Deutsch Sprachpaket',
        description: 'Deutsche Lokalisierung für die gesamte Benutzeroberfläche von Config Studio.',
      },
    },
    icon: '🇩🇪',
    repoUrl: 'https://github.com/EdvardBaldanov/config-studio-lang-de',
    tags: ['Localization', 'Language', 'German', 'Deutsch'],
  },
];

type SettingsTab = 'general' | 'security' | 'secrets' | 'plugins' | 'profile' | 'audit';

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
  const [availableLanguages, setAvailableLanguages] = useState<LanguageMeta[]>(getAvailableLanguages());
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangDropdownOpen]);

  useEffect(() => {
    return subscribeLanguages(() => {
      setAvailableLanguages(getAvailableLanguages());
    });
  }, []);

  const [bottomDockMode, setBottomDockMode] = useState<'auto' | 'always' | 'hidden'>(
    settings.bottomDockMode || 'auto'
  );

  // Sync local modal state when settings prop updates (e.g. after profile import)
  useEffect(() => {
    setTitle(settings.appTitle);
    setBaseColor(settings.baseColor);
    setAccentColor(settings.accentColor);
    setThemeMode(settings.themeMode);
    setLanguage(settings.language || 'ru');
    setBottomDockMode(settings.bottomDockMode || 'auto');
    setAuthEnabled(settings.authEnabled || false);
    setAuthUser(settings.authUser || 'admin');
    setApiEnabled(settings.apiEnabled || false);
    setApiKey(settings.apiKey || '');
    setPluginExecUnrestricted(settings.pluginExecUnrestricted || false);
    setStructureGuardEnabled(settings.structureGuardEnabled !== false);
    setCriticalPatterns((settings.criticalPatterns || []).join('\n'));
  }, [settings]);

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
  const [structureGuardEnabled, setStructureGuardEnabled] = useState(
    settings.structureGuardEnabled !== false
  );
  const [criticalPatterns, setCriticalPatterns] = useState<string>(
    (settings.criticalPatterns || []).join('\n')
  );
  const [pluginsList, setPluginsList] = useState<PluginItem[]>([]);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
  const [installTab, setInstallTab] = useState<'zip' | 'url'>('zip');
  const [installUrl, setInstallUrl] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [pendingInstall, setPendingInstall] = useState<PendingInstall | null>(null);
  const [isConfirmingInstall, setIsConfirmingInstall] = useState(false);

  // Audit Log State
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSeverity, setAuditSeverity] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [isExportingAudit, setIsExportingAudit] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Sources & Profile Portability
  const [sources, setSources] = useState<PluginSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isSyncingSources, setIsSyncingSources] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [showAddSourceForm, setShowAddSourceForm] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [profilePreview, setProfilePreview] = useState<ProfilePreview | null>(null);
  const [isProfileImportModalOpen, setIsProfileImportModalOpen] = useState(false);
  const [isImportingProfile, setIsImportingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  // Secrets & Credentials Store
  const [secretsList, setSecretsList] = useState<SecretMeta[]>([]);
  const [secretsStatus, setSecretsStatus] = useState<SecretsStatus | null>(null);
  const [isLoadingSecrets, setIsLoadingSecrets] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  // Unlock Modal
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Secret Editor (Add / Edit) Modal
  const [isSecretEditorOpen, setIsSecretEditorOpen] = useState(false);
  const [editingSecretId, setEditingSecretId] = useState<string | null>(null);
  const [secretTitle, setSecretTitle] = useState('');
  const [secretId, setSecretId] = useState('');
  const [secretType, setSecretType] = useState<SecretType>('password');
  const [secretScope, setSecretScope] = useState<SecretScope>('shared');
  const [secretValue, setSecretValue] = useState('');
  const [isSavingSecret, setIsSavingSecret] = useState(false);
  const [secretEditorError, setSecretEditorError] = useState('');

  const t = translations[language] || translations.ru;

  const loadSecrets = async () => {
    setIsLoadingSecrets(true);
    try {
      const [status, list] = await Promise.all([
        api.getSecretsStatus(),
        api.listSecrets(),
      ]);
      setSecretsStatus(status);
      setSecretsList(list);
    } catch (e) {
      console.error('Failed to load secrets:', e);
    } finally {
      setIsLoadingSecrets(false);
    }
  };

  const handleUnlockSecrets = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unlockPassword) return;
    setIsUnlocking(true);
    setUnlockError('');
    try {
      await api.unlockSecrets(unlockPassword);
      setSecretsStatus((prev) => (prev ? { ...prev, privilegedActive: true } : prev));
      setIsUnlockModalOpen(false);
      setUnlockPassword('');
      await loadSecrets();
    } catch (err: any) {
      setUnlockError(err.message || 'Invalid password');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleOpenCreateSecret = () => {
    if (!secretsStatus?.privilegedActive) {
      setIsUnlockModalOpen(true);
      return;
    }
    setEditingSecretId(null);
    setSecretTitle('');
    setSecretId('');
    setSecretType('password');
    setSecretScope('shared');
    setSecretValue('');
    setSecretEditorError('');
    setIsSecretEditorOpen(true);
  };

  const handleOpenEditSecret = async (item: SecretMeta) => {
    if (!secretsStatus?.privilegedActive) {
      setIsUnlockModalOpen(true);
      return;
    }
    setEditingSecretId(item.id);
    setSecretTitle(item.title);
    setSecretId(item.id);
    setSecretType(item.type);
    setSecretScope(item.scope);
    setSecretEditorError('');

    let val = revealedSecrets[item.id] || '';
    if (!val) {
      try {
        val = await api.getSecretValue(item.id);
        setRevealedSecrets((prev) => ({ ...prev, [item.id]: val }));
      } catch (err: any) {
        console.error('Failed to pre-fetch secret value for editing:', err);
      }
    }
    setSecretValue(val);
    setIsSecretEditorOpen(true);
  };

  const handleSaveSecret = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!secretTitle.trim()) {
      setSecretEditorError(language === 'en' ? 'Title is required' : 'Название обязательно для заполнения');
      return;
    }
    let idToUse = secretId.trim();
    if (!editingSecretId && !idToUse) {
      const slug = secretTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
      idToUse = secretScope === 'shared' ? `shared:${slug}` : slug;
    }
    if (!idToUse) {
      setSecretEditorError(language === 'en' ? 'Identifier is required' : 'Идентификатор (ID) обязателен');
      return;
    }
    if (!secretValue) {
      setSecretEditorError(language === 'en' ? 'Secret value cannot be empty' : 'Значение секрета не может быть пустым');
      return;
    }

    setIsSavingSecret(true);
    setSecretEditorError('');
    try {
      await api.saveSecret({
        id: idToUse,
        title: secretTitle.trim(),
        type: secretType,
        scope: secretScope,
        value: secretValue,
      });
      if (revealedSecrets[idToUse] !== undefined) {
        setRevealedSecrets((prev) => ({ ...prev, [idToUse]: secretValue }));
      }
      setIsSecretEditorOpen(false);
      await loadSecrets();
    } catch (err: any) {
      setSecretEditorError(err.message || 'Failed to save secret');
    } finally {
      setIsSavingSecret(false);
    }
  };

  const handleDeleteSecret = async (item: SecretMeta) => {
    if (!secretsStatus?.privilegedActive) {
      setIsUnlockModalOpen(true);
      return;
    }
    const confirmMsg = (t.secretDeleteConfirm || 'Delete secret "{name}"?').replace('{name}', item.title);
    if (!confirm(confirmMsg)) return;

    try {
      await api.deleteSecret(item.id);
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      await loadSecrets();
    } catch (err: any) {
      alert((language === 'en' ? 'Failed to delete secret: ' : 'Ошибка удаления секрета: ') + err.message);
    }
  };

  const handleToggleRevealSecret = async (item: SecretMeta) => {
    if (revealedSecrets[item.id] !== undefined) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    if (!secretsStatus?.privilegedActive) {
      setIsUnlockModalOpen(true);
      return;
    }

    setRevealingId(item.id);
    try {
      const val = await api.getSecretValue(item.id);
      setRevealedSecrets((prev) => ({ ...prev, [item.id]: val }));
    } catch (err: any) {
      alert((language === 'en' ? 'Failed to retrieve secret: ' : 'Не удалось получить секрет: ') + err.message);
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopySecretValue = async (item: SecretMeta) => {
    if (!secretsStatus?.privilegedActive) {
      setIsUnlockModalOpen(true);
      return;
    }

    try {
      let val = revealedSecrets[item.id];
      if (val === undefined) {
        val = await api.getSecretValue(item.id);
      }
      await copyToClipboard(val);
      setCopiedSecretId(item.id);
      setTimeout(() => setCopiedSecretId(null), 2000);
    } catch (err: any) {
      alert((language === 'en' ? 'Failed to copy secret: ' : 'Не удалось скопировать: ') + err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPlugins();
      loadSources();
      loadCatalog();
      loadSecrets();
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const items = await api.getCatalog();
      if (items && items.length > 0) {
        setCatalogItems(items);
      } else {
        setCatalogItems(
          OFFICIAL_CATALOG.map((c) => ({
            id: c.id,
            name: c.name,
            version: c.version,
            description: c.description,
            author: 'Config Studio Team',
            downloadUrl: c.repoUrl + '/archive/refs/heads/main.zip',
            homepage: c.repoUrl,
            sourceId: 'official',
            official: true,
            installed: pluginsList.some((p) => p.id === c.id),
            enabled: false,
            icon: c.icon,
            tags: c.tags,
            locales: c.locales,
          }))
        );
      }
    } catch (e) {
      console.warn('Failed to load remote catalog, using offline fallback:', e);
      setCatalogItems(
        OFFICIAL_CATALOG.map((c) => ({
          id: c.id,
          name: c.name,
          version: c.version,
          description: c.description,
          author: 'Config Studio Team',
          downloadUrl: c.repoUrl + '/archive/refs/heads/main.zip',
          homepage: c.repoUrl,
          sourceId: 'official',
          official: true,
          installed: pluginsList.some((p) => p.id === c.id),
          enabled: false,
          icon: c.icon,
          tags: c.tags,
          locales: c.locales,
        }))
      );
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const loadSources = async () => {
    setIsLoadingSources(true);
    try {
      const list = await api.getSources();
      setSources(list);
    } catch (e) {
      console.error('Failed to load sources:', e);
    } finally {
      setIsLoadingSources(false);
    }
  };

  const handleSyncSources = async () => {
    setIsSyncingSources(true);
    try {
      const res = await api.syncSources();
      setSources(res.sources);
      if (res.items && res.items.length > 0) {
        setCatalogItems(res.items);
      } else {
        await loadCatalog();
      }
      await loadPlugins();
      alert(language === 'en' ? 'Plugin sources synced successfully!' : 'Синхронизация каталогов успешно завершена!');
    } catch (e: any) {
      alert(language === 'en' ? `Sync error: ${e.message}` : `Ошибка синхронизации: ${e.message}`);
    } finally {
      setIsSyncingSources(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceUrl.trim()) return;
    setIsAddingSource(true);
    try {
      await api.addSource({ name: newSourceName.trim(), url: newSourceUrl.trim() });
      setNewSourceName('');
      setNewSourceUrl('');
      setShowAddSourceForm(false);
      await loadSources();
    } catch (e: any) {
      alert(language === 'en' ? `Failed to add source: ${e.message}` : `Ошибка добавления источника: ${e.message}`);
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleToggleSource = async (src: PluginSource) => {
    try {
      await api.updateSource(src.id, { enabled: !src.enabled });
      await loadSources();
    } catch (e: any) {
      alert(language === 'en' ? `Failed to update source: ${e.message}` : `Ошибка изменения источника: ${e.message}`);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this plugin source?' : 'Вы уверены, что хотите удалить этот источник плагинов?')) return;
    try {
      await api.deleteSource(id);
      await loadSources();
    } catch (e: any) {
      alert(language === 'en' ? `Failed to delete source: ${e.message}` : `Ошибка удаления источника: ${e.message}`);
    }
  };

  const handleProfileFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const preview = await api.previewProfile(text);
      setProfilePreview(preview);
      setIsProfileImportModalOpen(true);
    } catch (err: any) {
      alert(language === 'en' ? `Invalid profile file: ${err.message}` : `Неверный файл профиля: ${err.message}`);
    } finally {
      if (profileFileInputRef.current) {
        profileFileInputRef.current.value = '';
      }
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

      // 1. Reload settings in App.tsx immediately so theme and styles update live
      if (options.applySettings && onReloadSettings) {
        await onReloadSettings();
      }

      if (options.applySettings && profilePreview.profile.app) {
        const app = profilePreview.profile.app;
        if (app.appTitle) setTitle(app.appTitle);
        if (app.baseColor) setBaseColor(app.baseColor);
        if (app.accentColor) setAccentColor(app.accentColor);
        if (app.themeMode && (app.themeMode === 'dark' || app.themeMode === 'light')) {
          setThemeMode(app.themeMode);
        }
        if (app.language) setLanguage(app.language as Language);
        if (app.bottomDockMode) setBottomDockMode(app.bottomDockMode as any);
      }

      // 2. Reload plugins and sources
      await loadSources();
      await loadPlugins();
      if (options.autoInstallPlugins && onReloadPlugins) {
        await onReloadPlugins();
      }

      setIsProfileImportModalOpen(false);
      setProfilePreview(null);

      // 3. Clear and informative user feedback
      const sourcesAdded = res?.sourcesAdded ?? 0;
      const queuedCount = res?.pluginsQueued ? res.pluginsQueued.length : 0;
      const enabledCount = res?.pluginsEnabled ? res.pluginsEnabled.length : 0;

      const isEn = language === 'en';
      const details: string[] = [];
      if (res?.settingsApplied) {
        details.push(isEn ? '🎨 Theme and UI preferences successfully applied' : '🎨 Тема и параметры интерфейса успешно применены');
      }
      if (sourcesAdded > 0) {
        details.push(isEn ? `🌐 Added new sources: +${sourcesAdded}` : `🌐 Добавлено новых источников: +${sourcesAdded}`);
      }
      if (enabledCount > 0) {
        details.push(isEn ? `⚡ Activated plugins: ${enabledCount}` : `⚡ Активировано плагинов: ${enabledCount}`);
      }
      if (queuedCount > 0) {
        details.push(isEn ? `📦 Installed plugins: +${queuedCount}` : `📦 Установлено плагинов: +${queuedCount}`);
      }
      if (res?.errors && res.errors.length > 0) {
        details.push(isEn ? `⚠️ Plugin installation errors:\n  - ${res.errors.join('\n  - ')}` : `⚠️ Ошибки при установке плагинов:\n  - ${res.errors.join('\n  - ')}`);
      }

      if (details.length > 0) {
        alert(isEn ? `Profile successfully applied!\n\n• ${details.join('\n• ')}` : `Профиль успешно применен!\n\n• ${details.join('\n• ')}`);
      } else {
        alert(isEn ? 'Profile verified: all settings, sources, and plugins are already up to date.' : 'Профиль проверен: все настройки, источники и плагины уже соответствуют профилю.');
      }
    } catch (err: any) {
      alert(language === 'en' ? `Profile import error: ${err.message}` : `Ошибка импорта профиля: ${err.message}`);
    } finally {
      setIsImportingProfile(false);
    }
  };

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

  const handleInstallCatalogPlugin = async (p: CatalogItem | CatalogPlugin) => {
    setIsInstalling(true);
    setInstallMsg(null);
    try {
      const url =
        (p as CatalogItem).downloadUrl ||
        (p as CatalogPlugin).repoUrl ||
        (p as CatalogItem).homepage;
      const pending = await api.inspectPluginUrl(url);
      setPendingInstall(pending);
    } catch (err: any) {
      setInstallMsg({ text: err.message || `Ошибка проверки ${p.name}`, isError: true });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleConfirmConsent = async () => {
    if (!pendingInstall) return;

    // Check for disabled or missing dependencies
    if (pendingInstall.dependencyIssues && pendingInstall.dependencyIssues.length > 0) {
      const isEn = language === 'en';
      const disabled = pendingInstall.dependencyIssues.filter((i) => i.status === 'disabled');
      const missing = pendingInstall.dependencyIssues.filter((i) => i.status === 'missing');

      // 1. Enable disabled dependencies automatically with confirmation
      if (disabled.length > 0) {
        const depNames = disabled.map((d) => d.pluginId).join(', ');
        const ok = confirm(
          isEn
            ? `The following required plugins are disabled:\n${depNames}\n\nEnable them automatically?`
            : `Следующие необходимые плагины сейчас отключены:\n${depNames}\n\nВключить их автоматически?`
        );
        if (ok) {
          for (const d of disabled) {
            try {
              await api.togglePlugin(d.pluginId, true);
            } catch (e) {
              console.error('Failed to auto-enable dependency:', e);
            }
          }
        }
      }

      // 2. 1-Click install missing dependencies from catalog
      if (missing.length > 0) {
        const canInstallFromCatalog = missing.filter((m) =>
          catalogItems.some((c) => c.id === m.pluginId) ||
          OFFICIAL_CATALOG.some((c) => c.id === m.pluginId)
        );
        if (canInstallFromCatalog.length > 0) {
          const names = canInstallFromCatalog.map((m) => m.pluginId).join(', ');
          const ok = confirm(
            isEn
              ? `Plugin "${pendingInstall.manifest.name}" requires the following dependencies available in catalog:\n${names}\n\nInstall them automatically now in 1 click?`
              : `Для работы плагина "${pendingInstall.manifest.name}" требуются зависимости из каталога:\n${names}\n\nУстановить их автоматически прямо сейчас в 1 клик?`
          );
          if (ok) {
            for (const m of canInstallFromCatalog) {
              const catItem = catalogItems.find((c) => c.id === m.pluginId);
              const targetUrl =
                catItem?.downloadUrl ||
                catItem?.homepage ||
                OFFICIAL_CATALOG.find((c) => c.id === m.pluginId)?.repoUrl;
              if (targetUrl) {
                try {
                  const depPending = await api.inspectPluginUrl(targetUrl);
                  await api.confirmPluginInstall(depPending.tempKey);
                } catch (e) {
                  console.error('Failed to auto-install dependency:', e);
                }
              }
            }
          }
        }
      }
    }

    setIsConfirmingInstall(true);
    try {
      const installed = await api.confirmPluginInstall(pendingInstall.tempKey);
      setInstallMsg({
        text: `Плагин "${installed.name}" успешно установлен!`,
        isError: false,
      });
      setInstallUrl('');
      setPendingInstall(null);
      await loadPlugins();
      await pluginManager.loadPlugins();
    } catch (err: any) {
      setInstallMsg({ text: err.message || 'Ошибка подтверждения установки', isError: true });
    } finally {
      setIsConfirmingInstall(false);
    }
  };

  const handleCloseConsent = async () => {
    if (pendingInstall) {
      await api.cancelPluginInstall(pendingInstall.tempKey);
      setPendingInstall(null);
    }
  };

  const handleTogglePlugin = async (id: string, currentEnabled: boolean) => {
    if (currentEnabled) {
      const pluginItem = pluginsList.find((p) => p.id === id);
      if (pluginItem && pluginItem.dependents && pluginItem.dependents.length > 0) {
        const isEn = language === 'en';
        alert(
          isEn
            ? `Cannot disable "${pluginItem.name}". The following active plugins depend on it:\n${pluginItem.dependents.join(', ')}\n\nPlease disable dependent plugins first.`
            : `Нельзя отключить "${pluginItem.name}". От него зависят активные плагины:\n${pluginItem.dependents.join(', ')}\n\nСначала отключите зависимые плагины.`
        );
        return;
      }
    }

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
    const pluginItem = pluginsList.find((p) => p.id === id);
    if (pluginItem && pluginItem.dependents && pluginItem.dependents.length > 0) {
      const isEn = language === 'en';
      alert(
        isEn
          ? `Cannot delete "${name}". The following active plugins depend on it:\n${pluginItem.dependents.join(', ')}\n\nPlease disable or delete dependent plugins first.`
          : `Нельзя удалить плагин "${name}". От него зависят активные плагины:\n${pluginItem.dependents.join(', ')}\n\nСначала отключите или удалите зависимые плагины.`
      );
      return;
    }

    const isEn = language === 'en';
    if (!confirm(isEn ? `Are you sure you want to delete plugin "${name}"?` : `Вы действительно хотите удалить плагин "${name}"?`)) return;
    try {
      await api.deletePlugin(id);
      pluginManager.removePluginAssets(id);
      await loadPlugins();
    } catch (err: any) {
      alert(`Ошибка удаления плагина: ${err.message}`);
    }
  };

  const loadAuditLogs = async (sev = auditSeverity, query = auditSearch) => {
    setAuditLoading(true);
    try {
      const res = await api.getAuditLogs({
        severity: sev || undefined,
        search: query.trim() || undefined,
        limit: 100,
      });
      setAuditEvents(res.events || []);
      setAuditTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleExportAuditLogs = async () => {
    setIsExportingAudit(true);
    try {
      const blob = await api.exportAuditLogs();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config-studio-audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Ошибка экспорта логов: ${err.message}`);
    } finally {
      setIsExportingAudit(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [isOpen, activeTab]);

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
        structureGuardEnabled,
        criticalPatterns: criticalPatterns
          .split('\n')
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
        bottomDockMode,
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
    setStructureGuardEnabled(true);
    setCriticalPatterns('');
    setBottomDockMode('auto');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[50px] bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-[1400px] h-full max-h-[calc(100vh-100px)] bg-base-surface border border-base-border rounded-3xl shadow-2xl overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
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
              onClick={() => {
                setActiveTab('secrets');
                loadSecrets();
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'secrets'
                  ? 'bg-base-surface text-accent shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Key size={13} />
              <span>{t.tabSecrets}</span>
              {secretsList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-accent/20 text-accent text-[10px] rounded-full font-bold ml-1">
                  {secretsList.length}
                </span>
              )}
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

            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                loadSources();
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'profile'
                  ? 'bg-base-surface text-accent shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Share2 size={13} />
              <span>{t.tabProfile}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('audit');
                loadAuditLogs();
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'audit'
                  ? 'bg-base-surface text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ScrollText size={13} />
              <span>{t.tabAudit}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: General & Appearance */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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

            {/* Custom Language Selector Dropdown - only shown if more than 1 language is available */}
            {availableLanguages.length > 1 && (
              <div ref={langDropdownRef} className="relative">
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                <Globe className="w-4 h-4 text-accent" />
                <span>{t.language}</span>
              </label>

              {(() => {
                const currentLang = availableLanguages.find((l) => l.code === language) || {
                  code: language,
                  name: language === 'ru' ? 'Русский' : 'English',
                  flag: language === 'ru' ? '🇷🇺' : '🇬🇧',
                  isPlugin: false,
                };
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-black/30 border border-base-border hover:border-gray-400 dark:hover:border-gray-500 rounded-xl text-xs font-medium text-gray-900 dark:text-white flex items-center justify-between transition cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center space-x-2 truncate">
                        <span className="text-sm">{currentLang.flag}</span>
                        <span className="font-semibold">{currentLang.name}</span>
                        {currentLang.isPlugin && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 font-mono">
                            Pack
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          isLangDropdownOpen ? 'rotate-180 text-accent' : ''
                        }`}
                      />
                    </button>

                    {isLangDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white dark:bg-[#161b22] border border-base-border rounded-xl shadow-2xl p-1 space-y-0.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {availableLanguages.map((l) => {
                          const isSelected = language === l.code;
                          return (
                            <button
                              key={l.code}
                              type="button"
                              onClick={() => {
                                setLanguage(l.code);
                                setIsLangDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-accent/15 text-accent font-semibold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
                              }`}
                            >
                              <span className="flex items-center space-x-2 truncate">
                                <span className="text-sm">{l.flag}</span>
                                <span className="truncate">{l.name}</span>
                                {l.isPlugin && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 font-mono">
                                    Pack
                                  </span>
                                )}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
              </div>
            )}

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

            {/* Bottom Dock Strip Mode */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {t.dockStripSetting}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBottomDockMode('auto')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                    bottomDockMode === 'auto'
                      ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs'
                      : 'border-base-border bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="font-semibold">{t.dockModeAuto}</span>
                  <span className="text-[10px] opacity-75">{t.dockModeAutoDesc}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBottomDockMode('always')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                    bottomDockMode === 'always'
                      ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs'
                      : 'border-base-border bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="font-semibold">{t.dockModeAlways}</span>
                  <span className="text-[10px] opacity-75">{t.dockModeAlwaysDesc}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBottomDockMode('hidden')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
                    bottomDockMode === 'hidden'
                      ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs'
                      : 'border-base-border bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="font-semibold">{t.dockModeHidden}</span>
                  <span className="text-[10px] opacity-75">{t.dockModeHiddenDesc}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Security & API */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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

            {/* Structure Guard (Deep Pre-Save Validation) */}
            <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Structure Guard & Pre-Save Guard</span>
                </label>
                <input
                  type="checkbox"
                  checked={structureGuardEnabled}
                  onChange={(e) => setStructureGuardEnabled(e.target.checked)}
                  className="w-4 h-4 text-accent rounded cursor-pointer accent-teal-500"
                />
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {t.structureGuardDesc}
              </p>

              {structureGuardEnabled && (
                <div className="space-y-2 pt-2 border-t border-base-border">
                  <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300">
                    {t.criticalPatternsLabel}
                  </label>
                  <textarea
                    rows={3}
                    value={criticalPatterns}
                    onChange={(e) => setCriticalPatterns(e.target.value)}
                    placeholder="*.prod.json&#10;k8s/*.yaml&#10;my-service.conf"
                    className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                  />
                  <p className="text-[10px] text-gray-400 leading-normal">
                    {t.criticalPatternsHelp} <code>docker-compose*.yml</code>, <code>nginx.conf</code>, <code>*.service</code>, <code>.env.production</code>, <code>Caddyfile</code>, <code>*.prod.yaml</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Secrets & Credentials Store */}
        {activeTab === 'secrets' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Header info banner */}
            <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t.secretsTitle}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.secretsSubtitle}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-accent/10 border border-accent/30 text-accent font-semibold">
                    <ShieldCheck size={13} />
                    <span>{secretsStatus?.backend || 'Windows Credential Manager'}</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-base-border flex items-center space-x-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>{t.zeroSecretNotice}</span>
              </div>
            </div>

            {/* Condition 1: Password protection disabled */}
            {!authEnabled && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {t.authRequiredToManage}
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {t.authRequiredHelp}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('security')}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/40 transition flex items-center space-x-1.5"
                  >
                    <Shield size={13} />
                    <span>{t.tabSecurity}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Condition 2: Password protection enabled, but Privileged Mode locked */}
            {authEnabled && !secretsStatus?.privilegedActive && (
              <div className="p-4 rounded-2xl bg-gray-100/60 dark:bg-black/20 border border-base-border flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-base-border text-gray-400">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                      {t.privilegedLocked}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.privilegedLockedHelp}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUnlockError('');
                    setUnlockPassword('');
                    setIsUnlockModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition flex items-center space-x-1.5 shadow-sm shrink-0"
                >
                  <Unlock size={14} />
                  <span>{t.unlockSecretsBtn}</span>
                </button>
              </div>
            )}

            {/* Condition 3: Password protection enabled and Privileged Mode ACTIVE */}
            {authEnabled && secretsStatus?.privilegedActive && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 size={15} />
                  <span>{t.privilegedActiveBadge} (15m)</span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateSecret}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Plus size={14} />
                  <span>{t.addSecretBtn}</span>
                </button>
              </div>
            )}

            {/* Secrets List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Key size={14} className="text-accent" />
                  <span>{t.tabSecrets} ({secretsList.length})</span>
                </label>
                <button
                  type="button"
                  onClick={loadSecrets}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition"
                  title={t.refresh}
                >
                  <RefreshCw size={13} className={isLoadingSecrets ? 'animate-spin' : ''} />
                </button>
              </div>

              {isLoadingSecrets && secretsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 border border-base-border rounded-2xl bg-black/10 flex items-center justify-center space-x-2">
                  <RefreshCw size={14} className="animate-spin text-accent" />
                  <span>Loading secrets...</span>
                </div>
              ) : secretsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 border border-base-border rounded-2xl bg-black/10 flex flex-col items-center justify-center space-y-1.5">
                  <Key className="w-8 h-8 text-gray-500 opacity-60 mb-1" />
                  <span className="font-medium text-gray-300">{t.noSecretsFound}</span>
                  <span className="text-[11px] text-gray-500">
                    {authEnabled
                      ? 'Нажмите «Добавить секрет», чтобы сохранить учетные данные в хранилище.'
                      : 'Включите защиту паролем для добавления учетных данных.'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {secretsList.map((item) => {
                    const isRevealed = revealedSecrets[item.id] !== undefined;
                    const valueStr = isRevealed ? revealedSecrets[item.id] : '••••••••••••••••••••••••';
                    const isCopied = copiedSecretId === item.id;

                    const typeIcon =
                      item.type === 'ssh_key' ? (
                        <Shield className="w-3.5 h-3.5 text-sky-400" />
                      ) : item.type === 'token' ? (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Key className="w-3.5 h-3.5 text-emerald-400" />
                      );

                    const typeLabel =
                      item.type === 'ssh_key'
                        ? t.secretTypeSSHKey
                        : item.type === 'token'
                        ? t.secretTypeToken
                        : t.secretTypePassword;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-base-border bg-gray-50/50 dark:bg-black/20 hover:border-gray-500/30 transition space-y-3"
                      >
                        {/* Top row: Title + badges */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-black/30 border border-base-border shrink-0">
                              {typeIcon}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-gray-400 font-mono truncate">
                                ID: <span className="text-gray-300">{item.id}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                item.scope === 'shared'
                                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              }`}
                              title={
                                item.scope === 'shared'
                                  ? 'Общий секрет для серверов и хостов'
                                  : 'Секрет конкретного плагина'
                              }
                            >
                              {item.scope === 'shared' ? '🌐 Shared' : `🧩 ${item.pluginId || 'Plugin'}`}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/30 text-gray-300 border border-base-border">
                              {typeLabel}
                            </span>
                          </div>
                        </div>

                        {/* Middle row: Masked/Revealed secret container */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-base-border font-mono text-xs">
                          <div className="flex-1 truncate pr-3 select-all">
                            {isRevealed ? (
                              <span className="text-emerald-400 font-mono text-[11px] whitespace-pre-wrap break-all">
                                {valueStr}
                              </span>
                            ) : (
                              <span className="text-gray-500 select-none tracking-widest text-[11px]">
                                {valueStr}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom row: Timestamps & Action buttons */}
                        <div className="flex items-center justify-between pt-1 border-t border-base-border/50 text-[10px] text-gray-400">
                          <div>
                            {item.updatedAt && (
                              <span>
                                {language === 'en' ? 'Updated' : 'Обновлен'}:{' '}
                                {new Date(item.updatedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {/* Reveal / Hide */}
                            <button
                              type="button"
                              onClick={() => handleToggleRevealSecret(item)}
                              disabled={revealingId === item.id}
                              className="px-2.5 py-1 rounded-lg border border-base-border hover:border-gray-400 text-[11px] flex items-center space-x-1 text-gray-300 hover:text-white bg-black/20 transition disabled:opacity-50"
                              title={isRevealed ? t.hideSecret : t.revealSecret}
                            >
                              {revealingId === item.id ? (
                                <RefreshCw size={11} className="animate-spin" />
                              ) : isRevealed ? (
                                <EyeOff size={11} />
                              ) : (
                                <Eye size={11} />
                              )}
                              <span>{isRevealed ? t.hideSecret : t.revealSecret}</span>
                            </button>

                            {/* Copy value */}
                            <button
                              type="button"
                              onClick={() => handleCopySecretValue(item)}
                              className="px-2.5 py-1 rounded-lg border border-base-border hover:border-accent text-[11px] flex items-center space-x-1 text-gray-300 hover:text-white bg-black/20 transition"
                              title={t.copiedToClipboard}
                            >
                              {isCopied ? (
                                <Check size={11} className="text-emerald-400" />
                              ) : (
                                <Copy size={11} />
                              )}
                              <span>{isCopied ? t.copied : 'Copy'}</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditSecret(item)}
                              className="p-1 rounded-lg border border-base-border hover:border-gray-400 text-gray-300 hover:text-white bg-black/20 transition"
                              title={language === 'en' ? 'Edit secret' : 'Редактировать секрет'}
                            >
                              <Edit3 size={11} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSecret(item)}
                              className="p-1 rounded-lg border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-rose-300 bg-rose-500/10 transition"
                              title={t.delete}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Plugins System */}
        {activeTab === 'plugins' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                      <div className="flex items-center space-x-3 shrink-0 pt-0.5">
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
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
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
                    {t.catalogDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncSources}
                  disabled={isSyncingSources}
                  title={t.syncSources}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium border border-base-border bg-base-surface hover:border-gray-500/40 text-gray-300 flex items-center space-x-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isSyncingSources ? 'animate-spin text-accent' : ''} />
                  <span>{isSyncingSources ? t.syncingSources : t.syncSources}</span>
                </button>
              </div>

              {isLoadingCatalog && catalogItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center space-x-2">
                  <RefreshCw size={14} className="animate-spin text-accent" />
                  <span>{t.syncingSources}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {(catalogItems.length > 0
                    ? catalogItems
                    : OFFICIAL_CATALOG.map((c) => ({
                        id: c.id,
                        name: c.name,
                        version: c.version,
                        description: c.description,
                        author: 'Config Studio Team',
                        downloadUrl: c.repoUrl + '/archive/refs/heads/main.zip',
                        homepage: c.repoUrl,
                        sourceId: 'official',
                        official: true,
                        installed: pluginsList.some((p) => p.id === c.id),
                        enabled: false,
                        icon: c.icon,
                        tags: c.tags,
                        locales: c.locales,
                      }))
                  ).map((item) => {
                    const isInstalled = pluginsList.some((p) => p.id === item.id) || item.installed;
                    const catalogName =
                      item.locales?.[language]?.name || item.locales?.en?.name || item.name;
                    const catalogDesc =
                      item.locales?.[language]?.description ||
                      item.locales?.en?.description ||
                      item.description;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-base-border bg-white dark:bg-white/5 flex items-start justify-between gap-3 hover:border-gray-500/30 transition shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">{item.icon || '🧩'}</span>
                            <span className="font-semibold text-xs text-gray-900 dark:text-white">
                              {catalogName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-border text-gray-400 font-mono">
                              v{item.version}
                            </span>
                            {item.official && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent/15 text-accent font-medium border border-accent/30">
                                official
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                            {catalogDesc}
                          </p>

                          {item.tags && item.tags.length > 0 && (
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
                          )}
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
              )}
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
                    {t.githubUrlTip}
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

        {/* Tab 4: Profile Portability & Sources */}
        {activeTab === 'profile' && (
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
                      className="px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
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

              {/* Sources Table / List */}
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
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
          </div>
        )}

        {/* Tab 5: Core Audit Log */}
        {activeTab === 'audit' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Header Description */}
            <div className="flex items-start justify-between">
              <div>
                <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <ScrollText className="w-4 h-4 text-accent" />
                  <span>{t.auditTitle}</span>
                </label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {t.auditDesc}
                </p>
              </div>

              {/* Export button */}
              <button
                type="button"
                onClick={handleExportAuditLogs}
                disabled={isExportingAudit}
                title={t.auditExport}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Download size={13} className={`text-accent ${isExportingAudit ? 'animate-bounce' : ''}`} />
                <span>{isExportingAudit ? t.auditExporting : t.auditExport}</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    loadAuditLogs(auditSeverity, e.target.value);
                  }}
                  placeholder={t.auditSearchPlaceholder}
                  className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent transition"
                />
              </div>

              {/* Severity Filter Pills */}
              <div className="flex items-center space-x-1 p-1 bg-black/10 dark:bg-black/30 rounded-xl border border-base-border shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuditSeverity('');
                    loadAuditLogs('', auditSearch);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    auditSeverity === ''
                      ? 'bg-base-surface text-accent shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.auditFilterAll}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSeverity('critical');
                    loadAuditLogs('critical', auditSearch);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
                    auditSeverity === 'critical'
                      ? 'bg-red-500/20 text-red-400 shadow-xs'
                      : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  <span>🛑</span>
                  <span>{t.auditSeverityCritical}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSeverity('warn');
                    loadAuditLogs('warn', auditSearch);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
                    auditSeverity === 'warn'
                      ? 'bg-amber-500/20 text-amber-400 shadow-xs'
                      : 'text-gray-400 hover:text-amber-400'
                  }`}
                >
                  <span>⚠️</span>
                  <span>{t.auditSeverityWarn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSeverity('info');
                    loadAuditLogs('info', auditSearch);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
                    auditSeverity === 'info'
                      ? 'bg-blue-500/20 text-blue-400 shadow-xs'
                      : 'text-gray-400 hover:text-blue-400'
                  }`}
                >
                  <span>ℹ️</span>
                  <span>{t.auditSeverityInfo}</span>
                </button>
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => loadAuditLogs()}
                disabled={auditLoading}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-gray-400 hover:text-white transition shrink-0"
                title={t.auditRefresh}
              >
                <RefreshCw size={14} className={auditLoading ? 'animate-spin text-accent' : ''} />
              </button>
            </div>

            {/* Total Count and Status */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 px-1">
              <span>{t.auditTotal}: {auditTotal}</span>
              {auditLoading && <span className="text-accent">{t.auditRefreshing}</span>}
            </div>

            {/* Events List */}
            {auditEvents.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-gray-100/50 dark:bg-black/20 border border-base-border space-y-2">
                <ScrollText className="w-8 h-8 text-gray-400 mx-auto opacity-40" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {auditSearch || auditSeverity ? t.auditNoMatches : t.auditEmpty}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditEvents.map((evt) => {
                  const isExpanded = expandedAuditId === evt.id;
                  const dateStr = new Date(evt.timestamp).toLocaleString();
                  const isCritical = evt.severity === 'critical';
                  const isWarn = evt.severity === 'warn';

                  return (
                    <div
                      key={evt.id}
                      className={`p-3 rounded-xl border transition ${
                        isCritical
                          ? 'bg-red-500/5 border-red-500/30'
                          : isWarn
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-black/10 dark:bg-black/25 border-base-border hover:border-gray-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {/* Severity badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                              isCritical
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : isWarn
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {evt.severity}
                          </span>

                          {/* Action badge */}
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-black/20 dark:bg-white/10 text-gray-300">
                            {evt.action}
                          </span>

                          {/* Target */}
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 font-mono">
                            {evt.target}
                          </span>
                        </div>

                        {/* Timestamp & User */}
                        <div className="text-right shrink-0 text-[10px] text-gray-400">
                          <div>{dateStr}</div>
                          <div className="text-gray-500 font-mono">
                            {evt.user} {evt.ip ? `(${evt.ip})` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Details toggler */}
                      {evt.details && Object.keys(evt.details).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-base-border/50">
                          <button
                            type="button"
                            onClick={() => setExpandedAuditId(isExpanded ? null : evt.id)}
                            className="text-[10px] text-accent hover:underline flex items-center space-x-1"
                          >
                            <span>{isExpanded ? t.hideDetails : t.showDetails}</span>
                          </button>

                          {isExpanded && (
                            <pre className="mt-1.5 p-2 rounded-lg bg-black/40 border border-base-border text-[10px] font-mono text-gray-300 overflow-x-auto max-h-36">
                              {JSON.stringify(evt.details, null, 2)}
                            </pre>
                          )}
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

      <PluginConsentModal
        isOpen={!!pendingInstall}
        pending={pendingInstall}
        onClose={handleCloseConsent}
        onConfirm={handleConfirmConsent}
        isConfirming={isConfirmingInstall}
        language={language}
      />

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

      {/* Secrets Unlock Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-base-surface border border-base-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                <Lock className="w-4 h-4 text-accent" />
                <span>{t.unlockModalTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnlockModalOpen(false);
                  setUnlockError('');
                  setUnlockPassword('');
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t.privilegedLockedHelp}
            </p>

            <form onSubmit={handleUnlockSecrets} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder={t.unlockPasswordPlaceholder}
                  autoFocus
                  className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                />
                {unlockError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{unlockError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUnlockModalOpen(false);
                    setUnlockError('');
                    setUnlockPassword('');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking || !unlockPassword}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition disabled:opacity-50 flex items-center space-x-1"
                >
                  {isUnlocking ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>{t.unlocking}</span>
                    </>
                  ) : (
                    <>
                      <Unlock size={12} />
                      <span>{t.unlockSubmit}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Secret Modal */}
      {isSecretEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-base-surface border border-base-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                <Key className="w-4 h-4 text-accent" />
                <span>{editingSecretId ? t.editSecretModalTitle : t.addSecretModalTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSecretEditorOpen(false);
                  setSecretEditorError('');
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveSecret} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t.secretTitleLabel}
                </label>
                <input
                  type="text"
                  value={secretTitle}
                  onChange={(e) => setSecretTitle(e.target.value)}
                  placeholder={t.secretTitlePlaceholder}
                  autoFocus
                  className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                />
              </div>

              {/* ID Identifier */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t.secretIdLabel}
                </label>
                <input
                  type="text"
                  value={secretId}
                  onChange={(e) => setSecretId(e.target.value)}
                  placeholder={t.secretIdPlaceholder}
                  disabled={!!editingSecretId}
                  className={`w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent ${
                    editingSecretId ? 'opacity-60 cursor-not-allowed bg-black/10' : ''
                  }`}
                />
                {!editingSecretId && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {language === 'en'
                      ? 'Leave blank to generate automatically from title'
                      : 'Оставьте пустым для автогенерации из названия'}
                  </p>
                )}
              </div>

              {/* Secret Type & Scope grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    {t.secretTypeLabel}
                  </label>
                  <select
                    value={secretType}
                    onChange={(e) => setSecretType(e.target.value as SecretType)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                  >
                    <option value="password">{t.secretTypePassword}</option>
                    <option value="ssh_key">{t.secretTypeSSHKey}</option>
                    <option value="token">{t.secretTypeToken}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    {t.secretScopeLabel}
                  </label>
                  <select
                    value={secretScope}
                    onChange={(e) => setSecretScope(e.target.value as SecretScope)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                  >
                    <option value="shared">{t.secretScopeShared}</option>
                    <option value="plugin">{t.secretScopePlugin}</option>
                  </select>
                </div>
              </div>

              {/* Secret Value */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t.secretValueLabel}
                </label>
                {secretType === 'ssh_key' ? (
                  <textarea
                    rows={4}
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                    className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent resize-y"
                  />
                ) : (
                  <input
                    type="password"
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder={t.secretValuePlaceholder}
                    className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-base-border rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                  />
                )}
              </div>

              {secretEditorError && (
                <p className="text-[11px] text-rose-500 font-medium">{secretEditorError}</p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-base-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsSecretEditorOpen(false);
                    setSecretEditorError('');
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSecret}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-accent text-slate-900 hover:brightness-110 transition disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
                >
                  {isSavingSecret ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>{t.savingSecret}</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>{t.saveSecretBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
