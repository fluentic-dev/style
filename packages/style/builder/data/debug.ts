import { DEV_CONFIG } from '../../config/config/dev';
import { hashString } from '../../utils/hash';
import { type TraceCallsite } from '../../utils/trace';

export const LOC_LINE = 0;
export const LOC_COL = 1;

export const TRACE_STYLE = 0;
export const TRACE_VALUE = 1;

export const LABEL_SHORT = 0;
export const LABEL_LONG = 1;
export const LABEL_FILE = 2;

export type DebugLoc = [
  line: number,
  column: number,
  trace?: number,
  sourceUrl?: string,
  sourceContent?: string,
];

type DebugLabel = [
  short: string,
  long: string,
  file: string,
];

export type DebugData = {
  $$debug: true;
  loc: DebugLoc;
  label: DebugLabel;
  fields?: Record<string, DebugLoc | Record<number, DebugLoc>>;
  vars?: Record<string, string>;
  sourceUrl: string;
  code?: string;
};

export function isDebugData(value: unknown): value is DebugData {
  if (!value || typeof value !== 'object') return false;

  const data = value as Partial<DebugData>;
  return data.$$debug === true && Array.isArray(data.loc) && Array.isArray(data.label);
}

export function getDebugCallsiteId(debug: DebugData) {
  const label = debug.label[LABEL_SHORT] || debug.label[LABEL_LONG];

  if (!label) return null;

  const hash = debug.sourceUrl + '\n' + debug.loc[LOC_LINE] + ':' + debug.loc[LOC_COL] + '\n' +
    (debug.label[LABEL_LONG] || label);

  return label + '_' + hashString(hash);
}

export function getTraceCallsiteId(callsite: TraceCallsite) {
  const hash = callsite.filePath + '\n' + callsite.line + ':' + callsite.column;

  return hashString(hash);
}

export function getDebugCallsite(debug: DebugData): TraceCallsite {
  return createDebugCallsite(debug.loc, debug);
}

export function getDebugFieldCallsite(
  debug: DebugData | null,
  field: string,
): TraceCallsite | null {
  if (!debug) return null;

  const loc = getDebugFieldLoc(debug, field);

  return loc ? createDebugCallsite(loc, debug) : null;
}

export function getDebugFieldVarName(
  debug: DebugData | null,
  field: string,
) {
  return debug?.vars?.[field] ?? null;
}

export function getDebugFieldLoc(
  debug: DebugData | null,
  field: string,
) {
  const loc = debug?.fields?.[field];
  if (!loc) return null;
  if (Array.isArray(loc)) return loc;

  const trace = DEV_CONFIG.sourcemapLocationMode === 'value'
    ? TRACE_VALUE
    : TRACE_STYLE;

  return loc[trace] ?? loc[TRACE_STYLE] ?? loc[TRACE_VALUE] ?? null;
}

function createDebugCallsite(loc: DebugLoc, debug: DebugData): TraceCallsite {
  const [line, column] = loc;
  const sourceUrl = loc[3] ?? debug.sourceUrl;
  const sourceContent = loc[4] ?? debug.code;

  return {
    stack: `Error\n    at ${sourceUrl}:${line}:${column}`,
    filePath: sourceUrl,
    sourceUrl,
    sourceContent,
    line,
    column,
  };
}
