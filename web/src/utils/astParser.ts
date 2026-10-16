import { parseDocument, isMap, isSeq, isPair, isScalar, LineCounter } from 'yaml';
import { OutlineNode, OutlineNodeType } from '../types';

export function parseContentToOutline(
  content: string,
  language: string,
  filename: string
): { outline: OutlineNode[]; error?: string } {
  if (!content.trim()) {
    return { outline: [] };
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (language === 'yaml' || ext === 'yaml' || ext === 'yml') {
    return parseYaml(content);
  }

  if (language === 'json' || ext === 'json' || ext === 'jsonc') {
    return parseYaml(content); // yaml parser cleanly parses standard JSON and extracts AST with line numbers!
  }

  if (language === 'ini' || ext === 'ini' || ext === 'conf' || ext === 'cfg' || ext === 'env') {
    return parseIni(content);
  }

  if (language === 'toml' || ext === 'toml') {
    return parseToml(content);
  }

  if (language === 'markdown' || ext === 'md') {
    return parseMarkdown(content);
  }

  return { outline: [] };
}

function parseYaml(content: string): { outline: OutlineNode[]; error?: string } {
  try {
    const lineCounter = new LineCounter();
    const doc = parseDocument(content, { lineCounter, keepSourceTokens: true });

    if (doc.errors.length > 0) {
      const firstErr = doc.errors[0];
      return {
        outline: [],
        error: `YAML Syntax Error (line ${firstErr.linePos ? firstErr.linePos[0].line : 1}): ${firstErr.message}`,
      };
    }

    if (!doc.contents) {
      return { outline: [] };
    }

    let idCounter = 0;

    function buildNode(node: any, label: string = 'root'): OutlineNode | null {
      if (!node) return null;

      let line = 1;
      if (node.range && node.range[0] !== undefined) {
        const pos = lineCounter.linePos(node.range[0]);
        if (pos) line = pos.line;
      }

      if (isMap(node)) {
        const children: OutlineNode[] = [];
        for (const rawItem of node.items) {
          if (isPair(rawItem)) {
            const item = rawItem as any;
            const keyLabel = String(item.key?.value ?? item.key ?? 'key');
            let keyLine = line;
            if (item.key && item.key.range && item.key.range[0] !== undefined) {
              const pos = lineCounter.linePos(item.key.range[0]);
              if (pos) keyLine = pos.line;
            }

            const valNode = item.value;
            if (isMap(valNode) || isSeq(valNode)) {
              const child = buildNode(valNode, keyLabel);
              if (child) {
                child.line = keyLine;
                children.push(child);
              }
            } else {
              const val = item.value?.value ?? item.value;
              let scalarType: OutlineNodeType = 'string';
              if (typeof val === 'number') scalarType = 'number';
              else if (typeof val === 'boolean') scalarType = 'boolean';

              children.push({
                id: `node_${idCounter++}`,
                label: keyLabel,
                type: scalarType,
                line: keyLine,
                value: val !== undefined ? String(val) : '',
              });
            }
          }
        }
        return {
          id: `node_${idCounter++}`,
          label,
          type: 'object',
          line,
          children,
        };
      }

      if (isSeq(node)) {
        const children: OutlineNode[] = [];
        node.items.forEach((item: any, idx: number) => {
          let itemLine = line;
          if (item && item.range && item.range[0] !== undefined) {
            const pos = lineCounter.linePos(item.range[0]);
            if (pos) itemLine = pos.line;
          }

          if (isMap(item) || isSeq(item)) {
            const child = buildNode(item, `[${idx}]`);
            if (child) {
              child.line = itemLine;
              children.push(child);
            }
          } else {
            const val = item?.value ?? item;
            let scalarType: OutlineNodeType = 'string';
            if (typeof val === 'number') scalarType = 'number';
            else if (typeof val === 'boolean') scalarType = 'boolean';

            children.push({
              id: `node_${idCounter++}`,
              label: `[${idx}]`,
              type: scalarType,
              line: itemLine,
              value: String(val ?? ''),
            });
          }
        });

        return {
          id: `node_${idCounter++}`,
          label,
          type: 'list',
          line,
          children,
        };
      }

      if (isScalar(node)) {
        let scalarType: OutlineNodeType = 'string';
        if (typeof node.value === 'number') scalarType = 'number';
        else if (typeof node.value === 'boolean') scalarType = 'boolean';

        return {
          id: `node_${idCounter++}`,
          label,
          type: scalarType,
          line,
          value: String(node.value ?? ''),
        };
      }

      return null;
    }

    const root = buildNode(doc.contents, 'root');
    if (!root) return { outline: [] };

    return { outline: root.children || [root] };
  } catch (err: any) {
    return { outline: [], error: err.message || 'Failed to parse YAML' };
  }
}

function parseIni(content: string): { outline: OutlineNode[]; error?: string } {
  const lines = content.split('\n');
  const outline: OutlineNode[] = [];
  let currentSection: OutlineNode | null = null;
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const lineNum = i + 1;

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    // Section header [Section]
    const secMatch = trimmed.match(/^\[(.*?)\]$/);
    if (secMatch) {
      currentSection = {
        id: `ini_${idCounter++}`,
        label: secMatch[1],
        type: 'section',
        line: lineNum,
        children: [],
      };
      outline.push(currentSection);
      continue;
    }

    // Key-value pair: key = val or key: val
    const kvMatch = trimmed.match(/^([^:=]+)[:=](.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const val = kvMatch[2].trim();
      let valType: OutlineNodeType = 'string';
      if (/^(true|false|yes|no)$/i.test(val)) valType = 'boolean';
      else if (/^-?\d+(\.\d+)?$/.test(val)) valType = 'number';

      const node: OutlineNode = {
        id: `ini_${idCounter++}`,
        label: key,
        type: valType,
        line: lineNum,
        value: val,
      };

      if (currentSection && currentSection.children) {
        currentSection.children.push(node);
      } else {
        outline.push(node);
      }
    }
  }

  return { outline };
}

function parseToml(content: string): { outline: OutlineNode[]; error?: string } {
  const lines = content.split('\n');
  const outline: OutlineNode[] = [];
  let currentSection: OutlineNode | null = null;
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const lineNum = i + 1;

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Table [table] or [[array_of_tables]]
    const tableMatch = trimmed.match(/^\[{1,2}(.*?)\]{1,2}$/);
    if (tableMatch) {
      currentSection = {
        id: `toml_${idCounter++}`,
        label: tableMatch[1],
        type: trimmed.startsWith('[[') ? 'list' : 'section',
        line: lineNum,
        children: [],
      };
      outline.push(currentSection);
      continue;
    }

    // Key = Value
    const kvMatch = trimmed.match(/^([A-Za-z0-9_\-\."']+)\s*=\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim().replace(/^['"]|['"]$/g, '');
      const val = kvMatch[2].trim();
      let valType: OutlineNodeType = 'string';
      if (/^(true|false)$/i.test(val)) valType = 'boolean';
      else if (/^-?\d+(\.\d+)?$/.test(val)) valType = 'number';
      else if (val.startsWith('[')) valType = 'list';
      else if (val.startsWith('{')) valType = 'object';

      const node: OutlineNode = {
        id: `toml_${idCounter++}`,
        label: key,
        type: valType,
        line: lineNum,
        value: val.length > 25 ? val.substring(0, 25) + '...' : val,
      };

      if (currentSection && currentSection.children) {
        currentSection.children.push(node);
      } else {
        outline.push(node);
      }
    }
  }

  return { outline };
}

function parseMarkdown(content: string): { outline: OutlineNode[]; error?: string } {
  const lines = content.split('\n');
  const outline: OutlineNode[] = [];
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      outline.push({
        id: `md_${idCounter++}`,
        label: `${'#'.repeat(level)} ${text}`,
        type: 'section',
        line: i + 1,
      });
    }
  }

  return { outline };
}
