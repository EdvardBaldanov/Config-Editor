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
}

export interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
  extension: string;
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
