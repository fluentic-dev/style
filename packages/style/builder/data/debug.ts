import { hashString } from '../../utils/hash';
import { type TraceCallsite } from '../../utils/trace';

export const LOC_LINE = 0;
export const LOC_COL = 1;

export const LABEL_SHORT = 0;
export const LABEL_LONG = 1;
export const LABEL_FILE = 2;

type DebugLoc = [
  line: number,
  column: number,
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
  fields?: Record<string, DebugLoc>;
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
  const loc = debug?.fields?.[field];

  return loc ? createDebugCallsite(loc, debug) : null;
}

export function getDebugFieldVarName(
  debug: DebugData | null,
  field: string,
) {
  return debug?.vars?.[field] ?? null;
}

function createDebugCallsite(loc: DebugLoc, debug: DebugData): TraceCallsite {
  const [line, column] = loc;

  return {
    stack: `Error\n    at ${debug.sourceUrl}:${line}:${column}`,
    filePath: debug.sourceUrl,
    sourceUrl: debug.sourceUrl,
    sourceContent: debug.code,
    line,
    column,
  };
}
