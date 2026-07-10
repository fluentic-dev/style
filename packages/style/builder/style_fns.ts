import { DEV_CONFIG } from '../config/config/dev';
import type { Selector } from '../selector';
import type { StyleTransform } from '../style';
import type { StyleObject } from '../style/types';
import { traceMarker } from '../utils/trace';
import {
  type BuilderCallsite,
  type BuilderData,
  type DebugData,
  isStyleData,
  type ItemSelector,
  mergeScopeData,
  normalizeSelectorArg,
  type ScopeData,
  type ScopeItems,
  SELECTOR_ARG,
  SELECTOR_ARGS,
  SELECTOR_AT_RULE,
  SELECTOR_CONTAINER,
  SELECTOR_MEDIA,
  SELECTOR_MERGE,
} from './data';
import { checkSelector } from './data/check_selector';
import type { MergeData } from './style_data';
import type { AtRuleStyleData, MergeRuleStyleData, SelectorsRecord } from './types';
import { resolveCallsite, transformStyle } from './utils';

type Fns = Record<string, Function>;
type CreateFnResult<Data extends BuilderData> = (data: Data, fns: Fns) => Data;
type CloneScope = (
  source: ScopeData,
  callsite: BuilderCallsite | null,
) => ScopeData;
type CreateFn = (fns: Fns, fnName: string, selector: Selector) => Function | undefined;

export const createDefaultFnResult = <Data extends BuilderData>(data: Data, fns: Fns) => {
  return Object.assign(Object.create(fns), data);
};

export function createStyleFns<Data extends BuilderData>(
  mergeData: MergeData<Data>,
  selectors: SelectorsRecord,
  fnPrefix: string,
  transform: StyleTransform | null = null,
  createFnResult: CreateFnResult<Data> | null,
) {
  createFnResult = createFnResult || createDefaultFnResult;

  return createFns(
    selectors,
    fnPrefix,
    (fns, fnName, selector) => createStyleFn(mergeData, fns, createFnResult, fnPrefix, fnName, selector, transform),
  );
}

export function createScopeFns(
  selectors: SelectorsRecord,
  fnPrefix: string,
  cloneScope: CloneScope,
) {
  return createFns(
    selectors,
    fnPrefix,
    (_fns, fnName, selector) => createScopeFn(fnPrefix, fnName, selector, cloneScope),
  );
}

export function createFns(
  selectors: SelectorsRecord,
  fnPrefix: string,
  createFn: CreateFn,
) {
  const fns: Fns = {};

  Object.entries(selectors).forEach(([fnName, selector]) => {
    const fn = createFn(fns, fnName, selector);
    if (!fn) return;

    fns[fnName] = fn;

    traceMarker(fn, fnPrefix + fnName);
  });

  return fns;
}

function createStyleFn<Data extends BuilderData>(
  mergeData: MergeData<Data>,
  fns: Fns,
  createFnResult: CreateFnResult<Data>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: StyleTransform | null,
) {
  const selector = fnSelector.selector.trim();

  fnSelector = { ...fnSelector, selector };

  if (selector.startsWith(SELECTOR_AT_RULE)) {
    return createAtRuleFn(mergeData, fns, createFnResult, fnPrefix, fnName, fnSelector, transform);
  }

  if (selector.includes(SELECTOR_ARGS)) {
    return createArgsFn(mergeData, fns, createFnResult, fnPrefix, fnName, fnSelector, transform);
  }

  if (selector.includes(SELECTOR_ARG)) {
    return createArgFn(mergeData, fns, createFnResult, fnPrefix, fnName, fnSelector, transform);
  }

  if (selector !== SELECTOR_MERGE) {
    return createSimpleFn(mergeData, fns, createFnResult, fnSelector, transform);
  }

  return createMergeFn(mergeData, fns, createFnResult);
}

function createMergeFn<Data extends BuilderData>(
  mergeData: MergeData<Data>,
  fns: Fns,
  createFnResult: CreateFnResult<Data>,
) {
  return function(
    this: Data,
    style: MergeRuleStyleData,
    debug?: DebugData,
  ) {
    const callsite = resolveCallsite(debug);

    const items = Array.isArray(style) ? style : [style];

    let data = this;

    for (let i = 0, len = items.length; i < len; i++) {
      data = mergeData(
        data,
        callsite,
        items[i],
        debug ?? null,
        null,
        null,
      );
    }

    return createFnResult(data, fns);
  };
}

function createAtRuleFn<Data extends BuilderData>(
  mergeData: MergeData<Data>,
  fns: Fns,
  createFnResult: CreateFnResult<Data>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: StyleTransform | null,
) {
  const isMedia = fnSelector.selector.startsWith(SELECTOR_MEDIA) ||
    fnSelector.selector.startsWith(SELECTOR_CONTAINER);
  const hasArg = fnSelector.selector.includes(SELECTOR_ARGS);

  const [before, after] = fnSelector.selector.split(SELECTOR_ARGS);

  type Params = [
    arg: string | string[],
    style: AtRuleStyleData,
    debug?: DebugData,
  ];

  type PriorityParams = [priority: number, ...Params];
  type SelfParams = [style: AtRuleStyleData, debug?: DebugData];
  type PrioritySelfParams = [priority: number, ...SelfParams];

  return function(
    this: Data,
    ...params: Params | PriorityParams | SelfParams | PrioritySelfParams
  ) {
    let arg: Params[0];
    let style: Params[1];
    let debug: Params[2];
    let priority: number | null = null;

    if (hasArg) {
      if (isMedia && typeof params[0] === 'number') {
        priority = (params as PriorityParams)[0];
        arg = (params as PriorityParams)[1];
        style = (params as PriorityParams)[2];
        debug = (params as PriorityParams)[3];
      } else {
        arg = (params as Params)[0];
        style = (params as Params)[1];
        debug = (params as Params)[2];
      }
    } else if (isMedia && typeof params[0] === 'number') {
      priority = (params as PrioritySelfParams)[0];
      arg = fnSelector.selector;
      style = (params as PrioritySelfParams)[1];
      debug = (params as PrioritySelfParams)[2];
    } else {
      arg = fnSelector.selector;
      style = (params as SelfParams)[0];
      debug = (params as SelfParams)[1];
    }

    const callsite = resolveCallsite(debug);

    const args = Array.isArray(arg) ? arg : [arg];
    const items = Array.isArray(style) ? style : [style];

    let data = this;
    let selector: string;

    for (let i = 0, len = args.length; i < len; i++) {
      selector = args[i];

      if (hasArg && DEV_CONFIG.isCheckSelectorEnabled) {
        checkSelector(fnPrefix, fnName, fnSelector, selector);
      }

      selector = hasArg
        ? before + normalizeSelectorArg(selector) + after
        : selector;

      for (let j = 0, len = items.length; j < len; j++) {
        const item = items[j];
        data = mergeData(
          data,
          callsite,
          isStyleData(item) ? item : transformStyle(item as StyleObject, transform),
          debug ?? null,
          null,
          [priority !== null ? [selector, priority] : selector],
        );
      }
    }

    return createFnResult(data, fns);
  };
}

function createArgsFn<Data extends BuilderData>(
  mergeData: MergeData<Data>,
  fns: Fns,
  createFnResult: CreateFnResult<Data>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: StyleTransform | null,
) {
  const [before, after] = fnSelector.selector.split(SELECTOR_ARGS);
  const priority = fnSelector.priority;

  return function(
    this: Data,
    arg: string | string[],
    style: StyleObject,
    debug?: DebugData,
  ) {
    const callsite = resolveCallsite(debug);

    const args = Array.isArray(arg) ? arg : [arg];

    let data = this;
    let selector: string;

    for (let i = 0, len = args.length; i < len; i++) {
      selector = args[i];

      if (DEV_CONFIG.isCheckSelectorEnabled) {
        checkSelector(fnPrefix, fnName, fnSelector, selector);
      }

      selector = before + normalizeSelectorArg(selector) + after;

      data = mergeData(
        data,
        callsite,
        transformStyle(style, transform),
        debug ?? null,
        priority !== null ? [selector, priority] : selector,
        null,
      );
    }

    return createFnResult(data, fns);
  };
}

function createArgFn<Data extends BuilderData>(
  mergeData: MergeData<Data>,
  fns: Fns,
  createFnResult: CreateFnResult<Data>,
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  transform: StyleTransform | null,
) {
  const [before, after] = fnSelector.selector.split(SELECTOR_ARG);
  const priority = fnSelector.priority;

  return function(
    this: Data,
    arg: string,
    style: StyleObject,
    debug?: DebugData,
  ) {
    const callsite = resolveCallsite(debug);

    if (DEV_CONFIG.isCheckSelectorEnabled) {
      checkSelector(fnPrefix, fnName, fnSelector, arg);
    }

    const selector = before + normalizeSelectorArg(arg) + after;

    const data = mergeData(
      this,
      callsite,
      transformStyle(style, transform),
      debug ?? null,
      priority !== null ? [selector, priority] : selector,
      null,
    );

    return createFnResult(data, fns);
  };
}

function createSimpleFn<Data extends BuilderData>(
  mergeData: MergeData<Data>,
  fns: Fns,
  createFnResult: CreateFnResult<Data>,
  fnSelector: Selector,
  transform: StyleTransform | null,
) {
  const selector = fnSelector.selector;
  const priority = fnSelector.priority;

  return function(
    this: Data,
    style: StyleObject,
    debug?: DebugData,
  ) {
    const callsite = resolveCallsite(debug);

    const data = mergeData(
      this,
      callsite,
      transformStyle(style, transform),
      debug ?? null,
      priority !== null ? [selector, priority] : selector,
      null,
    );

    return createFnResult(data, fns);
  };
}

function createScopeFn(
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  cloneScope: CloneScope,
) {
  const selector = fnSelector.selector.trim();

  fnSelector = { ...fnSelector, selector };

  if (selector.startsWith(SELECTOR_AT_RULE)) {
    return createScopeAtRuleFn(fnPrefix, fnName, fnSelector, cloneScope);
  }

  if (selector.includes(SELECTOR_ARGS)) {
    return createScopeArgsFn(fnPrefix, fnName, fnSelector, cloneScope);
  }

  if (selector.includes(SELECTOR_ARG)) {
    return createScopeArgFn(fnPrefix, fnName, fnSelector, cloneScope);
  }

  if (selector === SELECTOR_MERGE) {
    return createScopeMergeFn(cloneScope);
  }

  return createScopeSimpleFn(fnSelector, cloneScope);
}

function createScopeMergeFn(
  cloneScope: CloneScope,
) {
  return function(
    this: ScopeData,
    data: ScopeItems,
    debug?: DebugData,
  ) {
    const callsite = resolveCallsite(debug);

    return mergeScopeItems(
      this,
      callsite,
      data,
      debug ?? null,
      null,
      null,
      cloneScope,
    );
  };
}

function createScopeAtRuleFn(
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  cloneScope: CloneScope,
) {
  const isMedia = fnSelector.selector.startsWith(SELECTOR_MEDIA) ||
    fnSelector.selector.startsWith(SELECTOR_CONTAINER);
  const hasArg = fnSelector.selector.includes(SELECTOR_ARGS);

  const [before, after] = fnSelector.selector.split(SELECTOR_ARGS);

  type Params = [
    arg: string | string[],
    data: ScopeItems,
    debug?: DebugData,
  ];

  type PriorityParams = [priority: number, ...Params];
  type SelfParams = [data: ScopeItems, debug?: DebugData];
  type PrioritySelfParams = [priority: number, ...SelfParams];

  return function(
    this: ScopeData,
    ...params: Params | PriorityParams | SelfParams | PrioritySelfParams
  ) {
    let arg: Params[0];
    let data: Params[1];
    let debug: Params[2];
    let priority: number | null = null;

    if (hasArg) {
      if (isMedia && typeof params[0] === 'number') {
        priority = (params as PriorityParams)[0];
        arg = (params as PriorityParams)[1];
        data = (params as PriorityParams)[2];
        debug = (params as PriorityParams)[3];
      } else {
        arg = (params as Params)[0];
        data = (params as Params)[1];
        debug = (params as Params)[2];
      }
    } else if (isMedia && typeof params[0] === 'number') {
      priority = (params as PrioritySelfParams)[0];
      arg = fnSelector.selector;
      data = (params as PrioritySelfParams)[1];
      debug = (params as PrioritySelfParams)[2];
    } else {
      arg = fnSelector.selector;
      data = (params as SelfParams)[0];
      debug = (params as SelfParams)[1];
    }

    const args = Array.isArray(arg) ? arg : [arg];
    const callsite = resolveCallsite(debug);

    let result = this;
    let selector: string;

    for (let i = 0, len = args.length; i < len; i++) {
      selector = args[i];

      if (hasArg && DEV_CONFIG.isCheckSelectorEnabled) {
        checkSelector(fnPrefix, fnName, fnSelector, selector);
      }

      selector = hasArg
        ? before + normalizeSelectorArg(selector) + after
        : selector;

      result = mergeScopeItems(
        result,
        callsite,
        data,
        debug ?? null,
        null,
        priority !== null ? [selector, priority] : selector,
        cloneScope,
      );
    }

    return result;
  };
}

function createScopeArgsFn(
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  cloneScope: CloneScope,
) {
  const [before, after] = fnSelector.selector.split(SELECTOR_ARGS);
  const priority = fnSelector.priority;

  return function(
    this: ScopeData,
    arg: string | string[],
    data: ScopeItems,
    debug?: DebugData,
  ) {
    const args = Array.isArray(arg) ? arg : [arg];
    const callsite = resolveCallsite(debug);

    let result = this;
    let selector: string;

    for (let i = 0, len = args.length; i < len; i++) {
      selector = args[i];

      if (DEV_CONFIG.isCheckSelectorEnabled) {
        checkSelector(fnPrefix, fnName, fnSelector, selector);
      }

      selector = before + normalizeSelectorArg(selector) + after;

      result = mergeScopeItems(
        result,
        callsite,
        data,
        debug ?? null,
        priority !== null ? [selector, priority] : selector,
        null,
        cloneScope,
      );
    }

    return result;
  };
}

function createScopeArgFn(
  fnPrefix: string,
  fnName: string,
  fnSelector: Selector,
  cloneScope: CloneScope,
) {
  const [before, after] = fnSelector.selector.split(SELECTOR_ARG);
  const priority = fnSelector.priority;

  return function(
    this: ScopeData,
    arg: string,
    data: ScopeItems,
    debug?: DebugData,
  ) {
    const callsite = resolveCallsite(debug);

    if (DEV_CONFIG.isCheckSelectorEnabled) {
      checkSelector(fnPrefix, fnName, fnSelector, arg);
    }

    const selector = before + normalizeSelectorArg(arg) + after;

    return mergeScopeItems(
      this,
      callsite,
      data,
      debug ?? null,
      priority !== null ? [selector, priority] : selector,
      null,
      cloneScope,
    );
  };
}

function createScopeSimpleFn(
  fnSelector: Selector,
  cloneScope: CloneScope,
) {
  const selector = fnSelector.selector;
  const priority = fnSelector.priority;

  return function(
    this: ScopeData,
    data: ScopeItems,
    debug?: DebugData,
  ) {
    const callsite = resolveCallsite(debug);

    return mergeScopeItems(
      this,
      callsite,
      data,
      debug ?? null,
      priority !== null ? [selector, priority] : selector,
      null,
      cloneScope,
    );
  };
}

function mergeScopeItems(
  scope: ScopeData,
  callsite: BuilderCallsite | null,
  data: ScopeItems,
  debug: DebugData | null,
  selector: ItemSelector | null,
  atRule: ItemSelector | null,
  cloneScope: CloneScope,
) {
  return mergeScopeData(cloneScope(scope, callsite), callsite, data, debug, selector, atRule);
}
