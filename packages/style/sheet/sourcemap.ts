import { type DebugData, LOC_COL, LOC_LINE, TRACE_STYLE, TRACE_VALUE } from '../builder/data/debug';
import { RUNTIME_CONFIG } from '../config';
import { normalizeCallsiteSourceUrl } from '../utils/trace';
import type { SheetCallsite } from './types';
import { createSourceMapComment as createSourceMapCommentBase } from './utils/sourcemap';

export type SourcemapRule = {
  css: string;
  callsite: SheetCallsite | null;
  debug?: DebugData | null;
  debugField?: string | null;
};

export function getRuleCallsite(
  callsite: SheetCallsite | null | undefined,
  debug: DebugData | null | undefined,
  debugField?: string | null,
): SheetCallsite | null {
  if (debug && debugField) {
    const loc = getDebugFieldLoc(debug, debugField);

    if (loc) {
      return normalizeRuleCallsite({
        filePath: debug.sourceUrl,
        sourceUrl: debug.sourceUrl,
        sourceContent: debug.code,
        line: loc[LOC_LINE],
        column: loc[LOC_COL],
      });
    }
  }

  if (callsite) return normalizeRuleCallsite(callsite);

  if (debug) {
    return normalizeRuleCallsite({
      filePath: debug.sourceUrl,
      sourceUrl: debug.sourceUrl,
      sourceContent: debug.code,
      line: debug.loc[LOC_LINE],
      column: debug.loc[LOC_COL],
    });
  }

  return callsite || null;
}

function normalizeRuleCallsite(callsite: SheetCallsite): SheetCallsite {
  return {
    ...callsite,
    filePath: normalizeCallsiteSourceUrl(callsite.filePath),
    sourceUrl: callsite.sourceUrl
      ? normalizeCallsiteSourceUrl(callsite.sourceUrl)
      : callsite.sourceUrl,
  };
}

export function createSourceMapComment(
  rules: SourcemapRule[],
) {
  return createSourceMapCommentBase(
    rules.map((rule) => ({
      css: rule.css,
      source: getSourcemapRuleCallsite(rule),
    })),
  );
}

export function getSourcemapRuleCallsite(rule: SourcemapRule) {
  return getRuleCallsite(rule.callsite, rule.debug, rule.debugField);
}

function getDebugFieldLoc(
  debug: DebugData,
  field: string,
) {
  const loc = debug.fields?.[field];
  if (!loc) return null;
  if (Array.isArray(loc)) return loc;

  const trace = RUNTIME_CONFIG.sourcemapTrace === 'value'
    ? TRACE_VALUE
    : TRACE_STYLE;

  return loc[trace] ?? loc[TRACE_STYLE] ?? loc[TRACE_VALUE] ?? null;
}
