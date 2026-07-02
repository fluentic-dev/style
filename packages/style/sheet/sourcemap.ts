import { type DebugData, getDebugFieldLoc, LOC_COL, LOC_LINE } from '../builder/data/debug';
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
        filePath: loc[3] ?? debug.sourceUrl,
        sourceUrl: loc[3] ?? debug.sourceUrl,
        sourceContent: loc[4] ?? debug.code,
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
