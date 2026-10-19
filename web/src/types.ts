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
}

export interface PluginItem extends PluginManifest {
  enabled: boolean;
  dir: string;
  installedAt: string;
  builtin?: boolean;
}

export interface PendingInstall {
  tempKey: string;
  manifest: PluginManifest;
  isOfficial: boolean;
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

export interface ToolbarButtonDef {
  id: string;
  pluginId: string;
  label: string;
  title?: string;
  icon?: string;
  visible?: () => boolean;
  onClick: () => void;
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
