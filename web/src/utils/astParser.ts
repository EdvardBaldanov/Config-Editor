import { parseDocument, isMap, isSeq, isPair, isScalar, LineCounter } from 'yaml';
import { OutlineNode, OutlineNodeType } from '../types';
import { pluginManager } from '../services/pluginLoader';

export function parseContentToOutline(
  content: string,
  language: string,
  filename: string
): { outline: OutlineNode[]; error?: string } {
  if (!content.trim()) {
    return { outline: [] };
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // 1. Check if a plugin registered an outline provider
  try {
    const customProvider =
      pluginManager.getOutlineProvider(language) ||
      pluginManager.getOutlineProvider(ext);
    if (customProvider) {
      const nodes = customProvider(content, filename);
      if (nodes && nodes.length > 0) {
        return { outline: nodes };
      }
    }
  } catch (e) {
    console.warn('[Plugin Outline Provider Error]:', e);
  }

  // 2. Built-in parsers
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

  if (language === 'html' || ext === 'html' || ext === 'htm' || ext === 'xhtml') {
    return parseHtml(content);
  }

  if (language === 'php' || ext === 'php' || ext === 'phtml') {
    return parsePhp(content);
  }

  if (language === 'xml' || ext === 'xml' || ext === 'svg') {
    return parseHtml(content);
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

function buildLineOffsets(content: string): number[] {
  const offsets = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

function getLineNumber(offsets: number[], pos: number): number {
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (offsets[mid] <= pos) {
      if (mid === offsets.length - 1 || offsets[mid + 1] > pos) {
        return mid + 1;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return 1;
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
  '!doctype',
]);

function parseHtml(content: string): { outline: OutlineNode[]; error?: string } {
  const lineOffsets = buildLineOffsets(content);
  const outline: OutlineNode[] = [];
  let idCounter = 0;

  const stack: Array<{ tag: string; node: OutlineNode }> = [];
  const tagRegex =
    /<!--[\s\S]*?-->|<\/([a-zA-Z0-9\-:]+)\s*>|<(!?[a-zA-Z0-9\-:]+)((?:\s+[^>]*?)?)(\/?)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const matchIndex = match.index;
    const lineNumber = getLineNumber(lineOffsets, matchIndex);

    // Skip comments
    if (fullMatch.startsWith('<!--')) {
      continue;
    }

    // Closing tag: </tag>
    if (match[1]) {
      const closeTag = match[1].toLowerCase();
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === closeTag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    // Opening or self-closing tag
    const rawTag = match[2];
    if (!rawTag) continue;
    const tag = rawTag.toLowerCase();
    const attrsStr = match[3] || '';
    const isSelfClosing = match[4] === '/' || VOID_ELEMENTS.has(tag);

    // Extract attributes
    const idMatch = attrsStr.match(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const idVal = idMatch ? (idMatch[1] ?? idMatch[2] ?? idMatch[3]) : '';

    const classMatch = attrsStr.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const classVal = classMatch ? (classMatch[1] ?? classMatch[2] ?? classMatch[3]) : '';

    const nameMatch = attrsStr.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const nameVal = nameMatch ? (nameMatch[1] ?? nameMatch[2] ?? nameMatch[3]) : '';

    const typeMatch = attrsStr.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const typeVal = typeMatch ? (typeMatch[1] ?? typeMatch[2] ?? typeMatch[3]) : '';

    const srcMatch = attrsStr.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const srcVal = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3]) : '';

    const hrefMatch = attrsStr.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const hrefVal = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3]) : '';

    const isHeading = /^h[1-6]$/.test(tag);
    const isLandmark = /^(header|nav|main|section|article|aside|footer|form)$/.test(tag);
    const isRoot = /^(html|head|body)$/.test(tag);
    const isImportantControl = /^(button|input|select|textarea|table|dialog|template)$/.test(tag);
    const isScriptOrStyle = /^(script|style|title)$/.test(tag);
    const isCustomTag = tag.includes('-');
    const hasIdentifier = Boolean(idVal);

    const shouldInclude =
      isRoot ||
      isLandmark ||
      isHeading ||
      hasIdentifier ||
      isImportantControl ||
      isScriptOrStyle ||
      isCustomTag ||
      (tag === 'div' && (hasIdentifier || classVal)) ||
      (tag === 'meta' && nameVal) ||
      (tag === 'link' && hrefVal);

    if (!shouldInclude) {
      continue;
    }

    let label = `<${tag}>`;
    let previewVal = '';

    if (isHeading) {
      const headingLevel = tag.toUpperCase();
      const afterTag = content.slice(matchIndex + fullMatch.length, matchIndex + fullMatch.length + 120);
      const textMatch = afterTag.match(/^([^<]+)/);
      const headingText = textMatch ? textMatch[1].trim() : '';
      label = `${headingLevel}: ${headingText ? (headingText.length > 25 ? headingText.slice(0, 25) + '…' : headingText) : tag}`;
      previewVal = headingText;
    } else if (tag === 'title') {
      const afterTag = content.slice(matchIndex + fullMatch.length, matchIndex + fullMatch.length + 100);
      const textMatch = afterTag.match(/^([^<]+)/);
      const titleText = textMatch ? textMatch[1].trim() : '';
      label = `<title>: ${titleText ? (titleText.length > 22 ? titleText.slice(0, 22) + '…' : titleText) : 'Document'}`;
      previewVal = titleText;
    } else if (idVal) {
      label = `<${tag}#${idVal}>`;
      if (classVal) previewVal = `class="${classVal.slice(0, 30)}"`;
    } else if (classVal) {
      const firstClass = classVal.split(/\s+/).filter(Boolean)[0] || '';
      label = `<${tag}.${firstClass}>`;
      previewVal = classVal.length > 30 ? classVal.slice(0, 30) + '…' : classVal;
    } else if (tag === 'input') {
      label = `<input${nameVal ? ` name="${nameVal}"` : typeVal ? ` [${typeVal}]` : ''}>`;
      if (nameVal && typeVal) previewVal = `type="${typeVal}"`;
    } else if (tag === 'button') {
      const afterTag = content.slice(matchIndex + fullMatch.length, matchIndex + fullMatch.length + 80);
      const textMatch = afterTag.match(/^([^<]+)/);
      const btnText = textMatch ? textMatch[1].trim() : '';
      label = `<button> ${btnText ? (btnText.length > 18 ? btnText.slice(0, 18) + '…' : btnText) : ''}`;
    } else if (tag === 'script') {
      label = srcVal ? `<script: ${srcVal.split('/').pop() || srcVal}>` : `<script>`;
      previewVal = srcVal;
    } else if (tag === 'link') {
      label = `<link: ${hrefVal.split('/').pop() || hrefVal}>`;
      previewVal = hrefVal;
    } else if (tag === 'meta' && nameVal) {
      label = `<meta: ${nameVal}>`;
    }

    const nodeType: OutlineNodeType =
      isHeading || isLandmark ? 'section' : isImportantControl ? 'string' : 'object';

    const node: OutlineNode = {
      id: `html_${idCounter++}`,
      label: label.trim(),
      type: nodeType,
      line: lineNumber,
      value: previewVal,
      children: isSelfClosing ? undefined : [],
    };

    if (stack.length > 0) {
      const parent = stack[stack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      outline.push(node);
    }

    if (!isSelfClosing) {
      stack.push({ tag, node });
    }
  }

  return { outline };
}

function parsePhp(content: string): { outline: OutlineNode[]; error?: string } {
  const outline: OutlineNode[] = [];
  let idCounter = 0;

  const lines = content.split('\n');
  let currentClassNode: OutlineNode | null = null;
  let inClassBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Namespace
    const nsMatch = trimmed.match(/^namespace\s+([^;{]+)/);
    if (nsMatch) {
      outline.push({
        id: `php_${idCounter++}`,
        label: `namespace ${nsMatch[1].trim()}`,
        type: 'section',
        line: lineNum,
      });
      continue;
    }

    // Class / Interface / Trait declaration
    const classMatch = trimmed.match(
      /^(?:(?:abstract|final|readonly)\s+)*(class|interface|trait)\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([a-zA-Z0-9_\\]+))?(?:\s+implements\s+([^{]+))?/i
    );
    if (classMatch) {
      const kind = classMatch[1].toLowerCase();
      const name = classMatch[2];
      const extendsClass = classMatch[3];
      const label = `${kind} ${name}${extendsClass ? ` : ${extendsClass}` : ''}`;

      currentClassNode = {
        id: `php_${idCounter++}`,
        label,
        type: 'object',
        line: lineNum,
        children: [],
      };
      outline.push(currentClassNode);
      inClassBraceDepth = 0;
      continue;
    }

    // Inside class
    if (currentClassNode) {
      const openCount = (line.match(/{/g) || []).length;
      const closeCount = (line.match(/}/g) || []).length;
      inClassBraceDepth += openCount - closeCount;

      const methodMatch = trimmed.match(
        /^(?:(public|protected|private)\s+)?(?:(static)\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/i
      );
      if (methodMatch) {
        const vis = methodMatch[1] || 'pub';
        const isStatic = Boolean(methodMatch[2]);
        const methodName = methodMatch[3];
        const params = methodMatch[4].trim();

        currentClassNode.children?.push({
          id: `php_${idCounter++}`,
          label: `${methodName}(${params.length > 20 ? params.slice(0, 20) + '…' : params})`,
          type: 'section',
          line: lineNum,
          value: `${vis}${isStatic ? ' static' : ''}`,
        });
        continue;
      }

      if (inClassBraceDepth <= 0 && i > currentClassNode.line - 1) {
        currentClassNode = null;
      }
    } else {
      // Top-level function
      const funcMatch = trimmed.match(/^function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/i);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const params = funcMatch[2].trim();
        outline.push({
          id: `php_${idCounter++}`,
          label: `function ${funcName}(${params.length > 20 ? params.slice(0, 20) + '…' : params})`,
          type: 'section',
          line: lineNum,
        });
        continue;
      }

      // define()
      const defMatch = trimmed.match(/^define\s*\(\s*['"]([^'"]+)['"]/i);
      if (defMatch) {
        outline.push({
          id: `php_${idCounter++}`,
          label: `define('${defMatch[1]}')`,
          type: 'string',
          line: lineNum,
        });
        continue;
      }
    }
  }

  // If the PHP file also contains HTML tags:
  if (
    content.includes('<html') ||
    content.includes('<body') ||
    content.includes('<div') ||
    content.includes('<header') ||
    content.includes('<section')
  ) {
    const htmlRes = parseHtml(content);
    if (htmlRes.outline.length > 0) {
      if (outline.length > 0) {
        return {
          outline: [
            {
              id: `php_symbols_${idCounter++}`,
              label: '🐘 PHP Символы & Функции',
              type: 'object',
              line: outline[0].line,
              children: outline,
            },
            ...htmlRes.outline,
          ],
        };
      }
      return htmlRes;
    }
  }

  return { outline };
}

