import picomatch from 'picomatch';
import { PrioritySelectors } from '../../selector/presets';
import { getStyleFnMeta, type StyleFnMeta, type StyleFnWithMeta } from '../../style/style';
import { isFunction, toArray } from '../../utils/object';
import { FN_STYLE, IMPORT_PATHS } from './constants';

export type ImportSourceInfo = {
  name: string;
  source: string;
};

export type ImportSourcePattern = string | RegExp;
export type ImportSourceCheckFn = (args: ImportSourceInfo) => boolean;

export type ImportSource = {
  styleFn: StyleFnWithMeta;
  source?: ImportSourcePattern | ImportSourcePattern[];
  name?: string | string[];
  check?: ImportSourceCheckFn;
};

export type ImportSourceMatcherState = {
  bySource: Map<string, Map<string, StyleFnMeta> | StyleFnMeta>;
  sourcePatterns: [SourceMatchFn, Map<string, StyleFnMeta> | StyleFnMeta][];
  globalNames: Map<string, StyleFnMeta>;
  checks: [ImportSourceCheckFn, StyleFnMeta][];
};

export type ImportSourceMatcher = (importSource: ImportSourceInfo) => StyleFnMeta | null;
type SourceMatchFn = (source: string) => boolean;

const DefaultStyleFnMeta: StyleFnMeta = {
  mode: 'StyleObject',
  selectors: PrioritySelectors,
  transform: null,
};

export function createImportSourceMatcher(
  importSources: ImportSource[] | null,
): ImportSourceMatcher {
  const state: ImportSourceMatcherState = {
    bySource: new Map(),
    sourcePatterns: [],
    globalNames: new Map(),
    checks: [],
  };

  addImportSourceEntry(state, {
    source: IMPORT_PATHS,
    name: FN_STYLE,
    meta: DefaultStyleFnMeta,
  });

  importSources?.forEach((entry) => {
    addImportSourceEntry(state, {
      ...entry,
      meta: getStyleFnMeta(entry.styleFn),
    });
  });

  return (source: ImportSourceInfo) => {
    return matchImportSource(state, source.source, source.name);
  };
}

function addImportSourceEntry(
  state: ImportSourceMatcherState,
  entry: {
    source?: ImportSourcePattern | ImportSourcePattern[];
    name?: string | string[];
    check?: ImportSourceCheckFn;
    meta: StyleFnMeta;
  },
) {
  const sourceList = entry.source ? toArray(entry.source) : [];
  const nameList = entry.name ? toArray(entry.name) : [];

  const hasSources = sourceList.length > 0;
  const hasNames = nameList.length > 0;

  if (hasSources && hasNames) {
    sourceList.forEach((source) => {
      nameList.forEach((name) => {
        addSourceNamePair(state, source, name, entry.meta);
      });
    });
    return;
  }

  if (hasSources) {
    sourceList.forEach((source) => {
      addSourceEntry(state, source, entry.meta);
    });

    return;
  }

  if (hasNames) {
    nameList.forEach((name) => {
      state.globalNames.set(name, entry.meta);
    });
  }

  if (isFunction(entry.check)) {
    state.checks.push([entry.check, entry.meta]);
  }
}

function matchImportSource(
  state: ImportSourceMatcherState,
  source: string,
  name: string,
) {
  const sourceNames = state.bySource.get(source);

  if (sourceNames && !(sourceNames instanceof Map)) return sourceNames;
  if (sourceNames instanceof Map) {
    const meta = sourceNames.get(name);
    if (meta) return meta;
  }

  const globalMeta = state.globalNames.get(name);
  if (globalMeta) return globalMeta;

  let p = 0;

  while (p < state.sourcePatterns.length) {
    const [match, sourceMeta] = state.sourcePatterns[p];

    if (match(source)) {
      if (sourceMeta instanceof Map) {
        const meta = sourceMeta.get(name);
        if (meta) return meta;
      } else {
        return sourceMeta;
      }
    }

    p++;
  }

  let i = 0;

  while (i < state.checks.length) {
    const [check, meta] = state.checks[i];
    if (check({ source, name })) return meta;
    i++;
  }

  return null;
}

function addSourceNamePair(
  state: ImportSourceMatcherState,
  source: ImportSourcePattern,
  name: string,
  meta: StyleFnMeta,
) {
  if (!source || !name) return;

  if (typeof source !== 'string' || isGlobPattern(source)) {
    const map = new Map<string, StyleFnMeta>();
    map.set(name, meta);
    state.sourcePatterns.push([createSourceMatch(source), map]);
    return;
  }

  const existing = state.bySource.get(source);
  if (existing && !(existing instanceof Map)) return;

  const next = existing || new Map<string, StyleFnMeta>();

  next.set(name, meta);
  state.bySource.set(source, next);
}

function addSourceEntry(
  state: ImportSourceMatcherState,
  source: ImportSourcePattern,
  meta: StyleFnMeta,
) {
  if (typeof source !== 'string' || isGlobPattern(source)) {
    state.sourcePatterns.push([createSourceMatch(source), meta]);
    return;
  }

  state.bySource.set(source, meta);
}

function createSourceMatch(source: ImportSourcePattern): SourceMatchFn {
  if (source instanceof RegExp) return (value) => source.test(value);

  return picomatch(source, {
    contains: true,
    dot: true,
  });
}

function isGlobPattern(source: string) {
  return /[*?[\]{}]/.test(source) || /[!+@?*]\(/.test(source);
}
