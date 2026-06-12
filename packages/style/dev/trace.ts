import { type EncodedSourceMap, originalPositionFor, sourceContentFor, TraceMap } from '@jridgewell/trace-mapping';
import { getDevSourcemapTags } from '../sheet/dev';
import { createSourceMapComment } from '../sheet/sourcemap';
import type { SheetCallsite } from '../sheet/types';
import { normalizeCallsiteSourceUrl } from '../utils/trace';

export type TraceSourcemapResult = {
  tags: number;
  rules: number;
  remapped: number;
  unresolved: number;
  sourcemaps: string[];
};

type SourceMapData = {
  url: string;
  sourceBaseUrl: string;
  rawMap: EncodedSourceMap;
  map: TraceMap;
  sourceRoot?: string;
};

const SOURCE_MAPPING_URL_REGEX = /(?:\/\/|\/\*)[#@]\s*sourceMappingURL=([^\s*]+)(?:\s*\*\/)?/g;

export async function traceDevSourcemaps(): Promise<TraceSourcemapResult> {
  const activeTags = getDevSourcemapTags().filter((item) =>
    item.sourceMapNode && item.sourceMapNode.parentNode === item.tag
  );
  const browserWindow = getBrowserWindow();
  const fetcher = browserWindow?.fetch?.bind(browserWindow);
  const sourceMapCache = new Map<string, Promise<SourceMapData | null>>();
  const sourcemaps = new Set<string>();
  let rules = 0;
  let remapped = 0;
  let unresolved = 0;

  for (let i = 0, len = activeTags.length; i < len; i++) {
    const item = activeTags[i];
    let touched = false;

    for (let j = 0, ruleLen = item.rules.length; j < ruleLen; j++) {
      const rule = item.rules[j];

      if (!rule.callsite) continue;
      if (isDisplaySourceUrl(rule.callsite.sourceUrl || rule.callsite.filePath)) continue;

      rules++;

      const nextCallsite = await traceCallsiteSourcemap(
        rule.callsite,
        fetcher,
        sourceMapCache,
      );

      if (nextCallsite) {
        if (nextCallsite.sourceMapUrl) sourcemaps.add(nextCallsite.sourceMapUrl);
        rule.callsite = nextCallsite.callsite;
        remapped++;
      } else {
        rule.callsite = createDisplayCallsite(rule.callsite);
        unresolved++;
      }

      touched = true;
    }

    if (touched) {
      rewriteDevSourcemapTag(item);
    }
  }

  return {
    tags: activeTags.length,
    rules,
    remapped,
    unresolved,
    sourcemaps: [...sourcemaps],
  };
}

async function traceCallsiteSourcemap(
  callsite: SheetCallsite,
  fetcher: typeof fetch | undefined,
  sourceMapCache: Map<string, Promise<SourceMapData | null>>,
): Promise<{ callsite: SheetCallsite; sourceMapUrl: string; } | null> {
  if (!fetcher) return null;

  const generatedUrl = getFetchableGeneratedUrl(
    callsite.sourceUrl || callsite.filePath,
  );

  if (!generatedUrl) return null;

  let sourceMapPromise = sourceMapCache.get(generatedUrl);

  if (!sourceMapPromise) {
    sourceMapPromise = fetchSourceMap(getGeneratedUrlFetchCandidates(generatedUrl), fetcher);
    sourceMapCache.set(generatedUrl, sourceMapPromise);
  }

  const sourceMap = await sourceMapPromise;

  if (!sourceMap) return null;

  const original = originalPositionFor(sourceMap.map, {
    line: callsite.line,
    column: Math.max(callsite.column - 1, 0),
  });

  if (!original.source || original.line == null || original.column == null) {
    return null;
  }

  const sourceUrl = resolveOriginalSourceUrl(
    original.source,
    sourceMap.sourceBaseUrl,
    sourceMap.sourceRoot,
  );
  const sourceContent = getSourceContent(sourceMap, original.source, sourceUrl);
  const displaySourceUrl = getDisplaySourceUrl(sourceUrl);

  return {
    sourceMapUrl: sourceMap.url,
    callsite: {
      filePath: displaySourceUrl,
      sourceUrl: displaySourceUrl,
      sourceContent,
      line: original.line,
      column: original.column + 1,
    },
  };
}

function rewriteDevSourcemapTag(item: ReturnType<typeof getDevSourcemapTags>[number]) {
  const document = item.tag.ownerDocument;

  item.tag.textContent = '';

  for (let i = 0, len = item.rules.length; i < len; i++) {
    item.tag.appendChild(document.createTextNode(item.rules[i].css + '\n'));
  }

  item.sourceMapNode = document.createTextNode('\n' + createSourceMapComment(item.rules));
  item.tag.appendChild(item.sourceMapNode);
}

function createDisplayCallsite(callsite: SheetCallsite): SheetCallsite {
  const displaySourceUrl = getDisplaySourceUrl(callsite.sourceUrl || callsite.filePath);

  return {
    ...callsite,
    filePath: displaySourceUrl,
    sourceUrl: displaySourceUrl,
  };
}

function isDisplaySourceUrl(sourceUrl: string) {
  return sourceUrl.startsWith('source://');
}

async function fetchSourceMap(
  generatedUrls: string[],
  fetcher: typeof fetch,
): Promise<SourceMapData | null> {
  for (const generatedUrl of generatedUrls) {
    try {
      const response = await fetcher(generatedUrl);

      if (!response.ok) continue;

      const source = await response.text();
      const sourceMapUrl = findSourceMapUrl(source, generatedUrl);

      if (!sourceMapUrl) continue;

      const rawMap = await loadSourceMap(sourceMapUrl, fetcher);

      if (!rawMap) continue;

      const sourceBaseUrl = sourceMapUrl.startsWith('data:')
        ? normalizeGeneratedUrl(generatedUrl)
        : sourceMapUrl;

      return {
        url: sourceMapUrl,
        sourceBaseUrl,
        rawMap,
        map: new TraceMap(rawMap, sourceBaseUrl),
        sourceRoot: typeof rawMap.sourceRoot === 'string' ? rawMap.sourceRoot : undefined,
      };
    } catch {
      // Try the next generated URL variant.
    }
  }

  return null;
}

async function loadSourceMap(sourceMapUrl: string, fetcher: typeof fetch) {
  try {
    if (sourceMapUrl.startsWith('data:')) {
      return parseDataUrlSourceMap(sourceMapUrl);
    }

    const response = await fetcher(sourceMapUrl);

    if (!response.ok) return null;

    return JSON.parse(await response.text()) as EncodedSourceMap;
  } catch {
    return null;
  }
}

function findSourceMapUrl(source: string, generatedUrl: string) {
  let match: RegExpExecArray | null = null;
  let sourceMapUrl: string | null = null;

  SOURCE_MAPPING_URL_REGEX.lastIndex = 0;

  while ((match = SOURCE_MAPPING_URL_REGEX.exec(source))) {
    sourceMapUrl = match[1];
  }

  if (!sourceMapUrl) return null;
  if (sourceMapUrl.startsWith('data:')) return sourceMapUrl;

  try {
    return new URL(sourceMapUrl, generatedUrl).href;
  } catch {
    return null;
  }
}

function parseDataUrlSourceMap(sourceMapUrl: string) {
  const commaIndex = sourceMapUrl.indexOf(',');

  if (commaIndex === -1) return null;

  const meta = sourceMapUrl.slice(0, commaIndex);
  const data = sourceMapUrl.slice(commaIndex + 1);
  const json = meta.endsWith(';base64') ? atob(data) : decodeURIComponent(data);

  return JSON.parse(json) as EncodedSourceMap;
}

function getFetchableGeneratedUrl(
  source: string,
): string | null {
  source = normalizeCallsiteSourceUrl(source);

  if (source.startsWith('webpack://') || source.startsWith('node:')) {
    return null;
  }

  try {
    return new URL(source).href;
  } catch {
    // Continue with a browser-relative resolution below.
  }

  const base = getBrowserLocationHref();

  if (!base) return null;

  try {
    return new URL(source, base).href;
  } catch {
    return null;
  }
}

function getGeneratedUrlFetchCandidates(url: string) {
  const normalized = normalizeGeneratedUrl(url);

  return url === normalized ? [url] : [url, normalized];
}

function getDisplaySourceUrl(sourceUrl: string) {
  sourceUrl = normalizeCallsiteSourceUrl(sourceUrl);
  const normalized = normalizeGeneratedUrl(sourceUrl);

  try {
    const url = new URL(normalized);
    return 'source:///' + url.pathname.replace(/^\/+/, '');
  } catch {
    return 'source:///' + normalized.replace(/^\/+/, '');
  }
}

function getSourceContent(
  sourceMap: SourceMapData,
  originalSource: string,
  resolvedSourceUrl: string,
) {
  const tracedContent = sourceContentFor(sourceMap.map, originalSource);

  if (tracedContent != null) return tracedContent;

  const rawSources = sourceMap.rawMap.sources;
  const rawSourcesContent = sourceMap.rawMap.sourcesContent;

  if (!rawSources || !rawSourcesContent) return undefined;

  const sourceKeys = getSourceMatchKeys(originalSource, resolvedSourceUrl);

  for (let i = 0, len = rawSources.length; i < len; i++) {
    const rawSource = rawSources[i];
    const rawContent = rawSourcesContent[i];

    if (typeof rawSource !== 'string') continue;
    if (typeof rawContent !== 'string') continue;

    const rawSourceUrl = resolveOriginalSourceUrl(
      rawSource,
      sourceMap.sourceBaseUrl,
      sourceMap.sourceRoot,
    );
    const rawKeys = getSourceMatchKeys(rawSource, rawSourceUrl);

    for (const key of rawKeys) {
      if (sourceKeys.has(key)) return rawContent;
    }
  }

  return undefined;
}

function getSourceMatchKeys(...sources: string[]) {
  const keys = new Set<string>();

  for (const source of sources) {
    if (!source) continue;

    keys.add(source);
    keys.add(normalizeGeneratedUrl(source));

    try {
      const url = new URL(source);
      keys.add(url.pathname);
      keys.add(normalizeGeneratedUrl(url.pathname));
    } catch {
      // Non-URL sources are still useful as exact keys.
    }
  }

  return keys;
}

function normalizeGeneratedUrl(source: string) {
  try {
    const url = new URL(source);

    url.search = '';
    url.hash = '';

    return url.href;
  } catch {
    const queryIndex = findFirstIndex(source, ['?', '#']);

    return queryIndex === -1 ? source : source.slice(0, queryIndex);
  }
}

function findFirstIndex(text: string, needles: string[]) {
  let index = -1;

  for (const needle of needles) {
    const next = text.indexOf(needle);
    if (next !== -1 && (index === -1 || next < index)) index = next;
  }

  return index;
}

function getBrowserLocationHref() {
  return getBrowserWindow()?.location.href;
}

function getBrowserWindow() {
  return typeof window === 'undefined' ? null : window;
}

function resolveOriginalSourceUrl(
  source: string,
  sourceMapUrl: string,
  sourceRoot?: string,
) {
  if (isAbsoluteSource(source)) return source;

  try {
    if (sourceRoot && !isAbsoluteSource(sourceRoot)) {
      return new URL(sourceRoot.replace(/\/?$/, '/') + source, sourceMapUrl).href;
    }

    if (sourceRoot) {
      return new URL(source, sourceRoot).href;
    }

    return new URL(source, sourceMapUrl).href;
  } catch {
    return sourceRoot ? sourceRoot.replace(/\/?$/, '/') + source : source;
  }
}

function isAbsoluteSource(source: string) {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(source) || source.startsWith('/');
}
