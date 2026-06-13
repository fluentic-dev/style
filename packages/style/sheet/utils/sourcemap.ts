import { normalizeCallsiteSourceUrl } from '../../utils/trace';

export type SourceMapSource = {
  filePath: string;
  sourceUrl?: string;
  sourceContent?: string;
  line: number;
  column: number;
};

export type SourceMapRule = {
  css: string;
  source: SourceMapSource | null;
};

type SourceEntry = {
  filePath: string;
  sourceIndex: number;
  sourceContent?: string;
};

const VLQ_BASE_SHIFT = 5;
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;
const VLQ_BASE_MASK = VLQ_BASE - 1;
const VLQ_CONTINUATION_BIT = VLQ_BASE;
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function createSourceMapComment(
  rules: SourceMapRule[],
) {
  const sources: SourceEntry[] = [];
  const sourceLookup: Record<string, SourceEntry> = Object.create(null);

  let generatedLine = 0;
  let previousSource = 0;
  let previousOriginalLine = 0;
  let previousOriginalColumn = 0;
  const mappingLines: string[] = [];

  for (let i = 0, len = rules.length; i < len; i++) {
    const rule = rules[i];
    const sourceData = rule.source;
    let mapping = '';

    if (sourceData) {
      const source = getSource(
        sources,
        sourceLookup,
        normalizeSourcePath(sourceData.sourceUrl || sourceData.filePath),
        sourceData.sourceContent,
      );
      const originalLine = Math.max(sourceData.line - 1, 0);
      const originalColumn = Math.max(sourceData.column - 1, 0);

      mapping += encodeVlq(0);
      mapping += encodeVlq(source.sourceIndex - previousSource);
      mapping += encodeVlq(originalLine - previousOriginalLine);
      mapping += encodeVlq(originalColumn - previousOriginalColumn);

      previousSource = source.sourceIndex;
      previousOriginalLine = originalLine;
      previousOriginalColumn = originalColumn;
    }

    mappingLines[generatedLine] = mapping;

    const lineCount = getLineCount(rule.css);

    for (let j = 1; j < lineCount; j++) {
      mappingLines[generatedLine + j] = '';
    }

    generatedLine += lineCount;
  }

  if (!sources.length) return '';

  const data = {
    version: 3,
    sources: sources.map((source) => source.filePath),
    sourcesContent: sources.some((source) => source.sourceContent !== undefined)
      ? sources.map((source) => source.sourceContent ?? null)
      : undefined,
    names: [],
    mappings: mappingLines.join(';'),
  };

  return '/*# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
    encodeBase64(JSON.stringify(data)) +
    ' */';
}

function encodeBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';

  for (let i = 0, len = bytes.length; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function getSource(
  sources: SourceEntry[],
  sourceLookup: Record<string, SourceEntry>,
  filePath: string,
  sourceContent?: string,
) {
  let source = sourceLookup[filePath];

  if (source) {
    if (source.sourceContent === undefined) source.sourceContent = sourceContent;
    return source;
  }

  source = {
    filePath,
    sourceIndex: sources.length,
    sourceContent,
  };

  sources.push(source);
  sourceLookup[filePath] = source;

  return source;
}

function normalizeSourcePath(filePath: string) {
  filePath = normalizeCallsiteSourceUrl(filePath);

  const atIndex = filePath.indexOf('/at ');

  if (atIndex !== -1) {
    return filePath.slice(atIndex + '/at '.length);
  }

  return filePath.replace(/^at\s+/, '');
}

function getLineCount(css: string) {
  let count = 1;

  for (let i = 0, len = css.length; i < len; i++) {
    if (css.charCodeAt(i) === 10) count++;
  }

  return count;
}

function encodeVlq(value: number) {
  let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
  let encoded = '';

  do {
    let digit = vlq & VLQ_BASE_MASK;

    vlq >>>= VLQ_BASE_SHIFT;

    if (vlq > 0) {
      digit |= VLQ_CONTINUATION_BIT;
    }

    encoded += BASE64[digit];
  } while (vlq > 0);

  return encoded;
}
