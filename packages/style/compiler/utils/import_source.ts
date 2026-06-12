import { isFunction, toArray } from '../../utils/object';
import { FN_STYLE, IMPORT_PATHS } from './constants';

export type ImportSourceInfo = {
  name: string;
  source: string;
};

export type ImportSourceCheckFn = (args: ImportSourceInfo) => boolean;

export type ImportSource = {
  source?: string | string[];
  name?: string | string[];
  check?: ImportSourceCheckFn;
};

export type ImportSourceMatcherState = {
  bySource: Map<string, Set<string> | null>;
  globalNames: Set<string>;
  checks: ImportSourceCheckFn[];
};

export type ImportSourceMatcher = (importSource: ImportSourceInfo) => boolean;

export function createImportSourceMatcher(
  importSources: ImportSource[] | null,
): ImportSourceMatcher {
  const state: ImportSourceMatcherState = {
    bySource: new Map(),
    globalNames: new Set<string>(),
    checks: [],
  };

  importSources = [
    { source: IMPORT_PATHS, name: FN_STYLE },
    ...(importSources ?? []),
  ];

  importSources.forEach((entry) => {
    const sourceList = entry.source ? toArray(entry.source) : [];
    const nameList = entry.name ? toArray(entry.name) : [];

    const hasSources = sourceList.length > 0;
    const hasNames = nameList.length > 0;

    if (hasSources && hasNames) {
      sourceList.forEach((source) => {
        nameList.forEach((name) => {
          addSourceNamePair(state, source, name);
        });
      });
      return;
    }

    if (hasSources) {
      sourceList.forEach((source) => {
        state.bySource.set(source, null);
      });

      return;
    }

    if (hasNames) {
      nameList.forEach((name) => {
        state.globalNames!.add(name);
      });
    }

    if (isFunction(entry.check)) {
      state.checks.push(entry.check);
    }
  });

  return (source: ImportSourceInfo) => {
    return matchImportSource(state, source.source, source.name);
  };
}

function matchImportSource(
  state: ImportSourceMatcherState,
  source: string,
  name: string,
) {
  const sourceNames = state.bySource.get(source);

  if (sourceNames === null) return true;
  if (sourceNames && sourceNames.has(name)) return true;
  if (state.globalNames?.has(name)) return true;

  let i = 0;

  while (i < state.checks.length) {
    if (state.checks[i]({ source, name })) return true;
    i++;
  }

  return false;
}

function addSourceNamePair(
  state: ImportSourceMatcherState,
  source: string,
  name: string,
) {
  if (!source || !name) return;

  const existing = state.bySource.get(source);
  if (existing === null) return;

  const next = existing || new Set<string>();

  next.add(name);
  state.bySource.set(source, next);
}
