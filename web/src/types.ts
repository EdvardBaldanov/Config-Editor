import { Language } from './utils/i18n';

export interface Settings {
  appTitle: string;
  baseColor: string;
  accentColor: string;
  themeMode: 'dark' | 'light';
  language: Language;
  hasCustomIcon: boolean;
  iconMime?: string;
  authEnabled: boolean;
  authUser: string;
  authPass?: string;
  apiEnabled: boolean;
  apiKey?: string;
  pluginExecUnrestricted?: boolean;
  structureGuardEnabled?: boolean;
  criticalPatterns?: string[];
  bottomDockMode?: 'auto' | 'always' | 'hidden';
}

export interface LanguagePackDef {
  code: string;
  name: string;
  flag?: string;
  translations?: Record<string, string>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  entry: string;
  css?: string;
  permissions?: string[];
  fileMatches?: string[];
  minAppVersion?: string;
  dependencies?: Record<string, string>;
  providesServices?: string[];
  locales?: Record<string, Record<string, string>>;
  localization?: LanguagePackDef;
}

export interface PluginItem extends PluginManifest {
  enabled: boolean;
  dir: string;
  installedAt: string;
  builtin?: boolean;
  dependents?: string[];
}

export interface DependencyIssue {
  pluginId: string;
  required: string;
  installed?: string;
  status: 'missing' | 'incompatible' | 'disabled';
}

export interface PendingInstall {
  tempKey: string;
  manifest: PluginManifest;
  isOfficial: boolean;
  dependencyIssues?: DependencyIssue[];
  createdAt: string;
}

export interface ProcessInfo {
  id: string;
  pluginId: string;
  command: string;
  args: string[];
  pid: number;
  port?: number;
  startedAt: string;
  status: 'running' | 'stopped' | 'failed';
}

export interface SplitPanelDef {
  id: string;
  pluginId: string;
  title: string;
  open: boolean;
  render: (container: HTMLElement) => void;
}

export interface SplitActionOption {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  isDefault?: boolean;
  onClick?: () => void;
}

export interface ToolbarButtonDef {
  id: string;
  pluginId: string;
  label: string;
  title?: string;
  icon?: string;
  shortcut?: string;
  fileMatches?: string[];
  options?: SplitActionOption[];
  activeOptionId?: string;
  visible?: (file?: OpenFile | null) => boolean;
  onSelectOption?: (optionId: string) => void;
  onClick: (selectedOptionId?: string) => void;
}

export interface HeaderItemDef {
  id: string;
  pluginId: string;
  order?: number;
  render: (container: HTMLElement) => void;
}

export interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
  createdAt?: string;
  extension: string;
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  lineCount: number;
  charCount: number;
  sha256: string;
  modifiedAt?: string;
  createdAt?: string;
}

export type OutlineNodeType =
  | 'object'
  | 'list'
  | 'string'
  | 'number'
  | 'boolean'
  | 'section';

export interface OutlineNode {
  id: string;
  label: string;
  type: OutlineNodeType;
  line: number;
  value?: string;
  children?: OutlineNode[];
}

export interface FileRevision {
  id: string;
  timestamp: Date;
  content: string;
  linesCount: number;
  linesDelta: number;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  initialContent: string;
  isDirty: boolean;
  language: string;
  revisions: FileRevision[];
}

export type AuditSeverity = 'info' | 'warn' | 'critical';

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  ip: string;
  action: string;
  severity: AuditSeverity;
  target: string;
  details?: Record<string, any>;
}

export interface AuditQueryResponse {
  events: AuditEvent[];
  total: number;
}

export type GuardSeverity = 'critical' | 'warning' | 'info';

export interface GuardIssue {
  file: string;
  severity: GuardSeverity;
  line: number;
  column: number;
  message: string;
  snippet?: string;
  rule: string;
}

export interface GuardValidationResult {
  valid: boolean;
  isGuarded: boolean;
  issues: GuardIssue[];
}

export interface PluginSource {
  id: string;
  name: string;
  url: string;
  official: boolean;
  enabled: boolean;
  lastSync?: string;
  pluginsCount: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  downloadUrl: string;
  sourceId: string;
  official: boolean;
  installed: boolean;
  enabled: boolean;
  icon?: string;
  tags?: string[];
}

export interface StudioProfile {
  $schema?: string;
  version: string;
  exportedAt: string;
  app: {
    appTitle: string;
    baseColor: string;
    accentColor: string;
    themeMode: string;
    language: string;
    bottomDockMode?: string;
    structureGuardEnabled?: boolean;
    criticalPatterns?: string[];
  };
  sources: PluginSource[];
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    enabled: boolean;
    sourceUrl?: string;
  }>;
}

export interface ProfilePreview {
  profile: StudioProfile;
  settingsDiff: string[];
  newSources: PluginSource[];
  pluginsStatus: Array<{
    id: string;
    name: string;
    version: string;
    installed: boolean;
    action: 'already_installed' | 'to_install' | 'will_enable';
  }>;
}

export interface ProfileImportResult {
  settingsApplied: boolean;
  sourcesAdded: number;
  pluginsQueued: string[];
  pluginsEnabled?: string[];
  errors?: string[];
}
