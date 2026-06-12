const FN_MARKER = '$fn_';

export function traceMarker(fn: unknown, name: string) {
  Object.defineProperty(fn, 'name', {
    value: FN_MARKER + name,
    configurable: true,
  });
}

// Regex to capture file paths, line numbers, and column numbers from stack frames.
// Handles standard paths and URLs after parenthesized frame labels are removed.
const CALLSITE_REGEX = /(.+):(\d+):(\d+)$/;

export type TraceCallsite = {
  stack: string;
  filePath: string;
  sourceUrl?: string;
  sourceContent?: string;
  line: number;
  column: number;
};

export function traceCallsite(): TraceCallsite | null {
  const error = new Error();

  const adjustedError = traceAdjustError(error);
  const stack = adjustedError.stack || '';
  const lines = stack.split('\n');

  const frames = lines.slice(1);
  const parsedFrames = frames.map(parseStackFrame).filter((frame) => frame !== null);
  if (!parsedFrames.length) return null;

  const targetFrame = parsedFrames.find((frame) => !isInternalCallsite(frame.filePath)) ??
    parsedFrames[0];

  return {
    stack: [lines[0] || 'Error', createStackFrameLine(targetFrame)].join('\n'),
    filePath: targetFrame.filePath,
    sourceUrl: targetFrame.sourceUrl,
    line: targetFrame.line,
    column: targetFrame.column,
  };
}

type ParsedStackFrame = {
  filePath: string;
  sourceUrl?: string;
  line: number;
  column: number;
};

function parseStackFrame(lineText: string): ParsedStackFrame | null {
  const match = getStackFrameLocationText(lineText).match(CALLSITE_REGEX);
  if (!match) return null;
  const rawFilePath = normalizeCallsiteSourceUrl(match[1]);

  return {
    filePath: normalizeCallsiteFilePath(rawFilePath),
    sourceUrl: isFetchableCallsiteSourceUrl(rawFilePath) ? rawFilePath : undefined,
    line: parseInt(match[2], 10),
    column: parseInt(match[3], 10),
  };
}

function getStackFrameLocationText(lineText: string) {
  let frame = lineText.trim().replace(/^at\s+/, '');

  if (frame.endsWith(')')) {
    const parenIndex = frame.lastIndexOf('(');

    if (parenIndex !== -1) {
      frame = frame.slice(parenIndex + 1, -1);
    }
  }

  return frame;
}

export function normalizeCallsiteSourceUrl(source: string) {
  let filePath = source.trim();

  try {
    filePath = decodeURI(filePath);
  } catch {
    // Keep the raw path if a bundler produced a partially escaped URL.
  }

  if (filePath.startsWith('source:///at ') || filePath.startsWith('source:///at%20')) {
    filePath = filePath.slice('source:///'.length);
  }

  const strayAtMatch = filePath.match(/(?:^|\/)at\s+([a-zA-Z][a-zA-Z\d+.-]*:\/\/.+|\/.+)$/);

  return strayAtMatch ? strayAtMatch[1] : filePath.replace(/^at\s+/, '');
}

function normalizeCallsiteFilePath(filePath: string) {
  filePath = normalizeCallsiteSourceUrl(filePath);

  // strip query strings (e.g., file.ts?vue&type=script or file.js?v=123)
  const queryIndex = findFirstIndex(filePath, ['?', '#']);
  if (queryIndex !== -1) {
    filePath = filePath.substring(0, queryIndex);
  }

  // clean up potential absolute URL schemes left over by web bundlers (e.g., file:///)
  filePath = filePath.replace(/^file:\/\/\/?/, '');

  if (filePath.startsWith('/@fs/')) {
    filePath = '/' + filePath.slice('/@fs/'.length);
  }

  const webpackInternalMatch = filePath.match(/^webpack-internal:\/\/\/(?:\([^)]+\)\/)?(.+)$/);
  if (webpackInternalMatch) {
    filePath = webpackInternalMatch[1];
  }

  const webpackSourceMatch = filePath.match(/^webpack:\/\/[^/]+\/(.+)$/);
  if (webpackSourceMatch) {
    filePath = webpackSourceMatch[1];
  }

  return filePath;
}

function isFetchableCallsiteSourceUrl(filePath: string) {
  return /^https?:\/\//.test(filePath) || filePath.startsWith('/');
}

function findFirstIndex(text: string, needles: string[]) {
  let index = -1;

  for (const needle of needles) {
    const next = text.indexOf(needle);
    if (next !== -1 && (index === -1 || next < index)) index = next;
  }

  return index;
}

function createStackFrameLine(frame: ParsedStackFrame) {
  return `    at ${frame.filePath}:${frame.line}:${frame.column}`;
}

function isInternalCallsite(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');

  return normalized.startsWith('node:') ||
    normalized.startsWith('internal/') ||
    normalized.includes('/node_modules/') ||
    normalized.includes('/packages/style/dist/') ||
    normalized.includes('/packages/style/builder/') ||
    normalized.includes('/packages/style/runtime/') ||
    normalized.includes('/packages/style/utils/trace.');
}

export type TraceErrorOptions = TraceAdjustErrorOptions & {
  stack?: string | null;
  name?: string | null;
};

export function traceError(message: string | null, options: TraceErrorOptions = {}) {
  const error = new Error(message || '');

  error.name = options.name || 'StyleError';

  if (typeof options.stack === 'string') {
    error.stack = options.stack;
    return error;
  }

  return traceAdjustError(error, options);
}

export type TraceAdjustErrorOptions = {
  offset?: number;
  limit?: number;
};

export function traceAdjustError(error: Error, options: TraceAdjustErrorOptions = {}) {
  const offset = options.offset ?? 0;

  const stack = error.stack;

  if (!stack) return error;

  const lines = stack.split('\n');

  const markerIndex = lines.findIndex((line) => line.includes(FN_MARKER));

  // marker not found
  if (markerIndex === -1) {
    return error;
  }

  const traced = new Error(error.message);
  traced.name = error.name;

  const frameStartIndex = Math.max(markerIndex + 1 + offset, 1);

  let frames = lines.slice(frameStartIndex);

  if (options.limit) {
    frames = frames.slice(0, options.limit);
  }

  traced.stack = [lines[0], ...frames].join('\n');

  return traced;
}
