import { getAtomicClassName, getClassNameDedupe } from '../../../../atomic/className';
import { LayerDefaultPriority } from '../../../../atomic/layer';
import { buildAtomicRule, getAtomicRuleLayerPriority } from '../../../../atomic/rule';
import { getTokenOverrideValue, getTokenVar, getTokenVarName } from '../../../../atomic/token';
import { getCssVarRawFallback } from '../../../../atomic/utils/css';
import { shouldAppendCssPx } from '../../../../atomic/value';
import { getLocalVarName } from '../../../../atomic/var';
import {
  normalizeSelectorArg,
  SELECTOR_ARG,
  SELECTOR_ARGS,
  SELECTOR_AT_RULE,
  SELECTOR_CONTAINER,
  SELECTOR_MEDIA,
  SELECTOR_MERGE,
} from '../../../../builder/data';
import {
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_NUMBER_PX,
  ITEM_VALUE_TYPE_AT_RULE_REF,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../../../../builder/data/const';
import type { DebugLoc } from '../../../../builder/data/debug';
import { isScopeData, isSlotOverrideData, isStyleData } from '../../../../builder/data/is';
import type {
  ExtractedItemValue,
  ItemSelector,
  RuntimeScopeItem,
  RuntimeSlotOverrideItem,
  RuntimeStyleItem,
} from '../../../../builder/data/state';
import type { ClassNameFormat, TokenNameFormat, TransformClassNameFormat } from '../../../../config/types';
import type { Selector } from '../../../../selector/types';
import type { StyleFnMeta } from '../../../../style/style';
import {
  getStyleTokenId,
  isStyleTokenData,
  isStyleTokenOverrideData,
  type StyleTokenOverride,
} from '../../../../style/token';
import {
  type ClassNameTransform,
  classNameValue,
  isClassNameValue,
  type StyleTransform,
} from '../../../../style/transform';
import { isAtRuleRef } from '../../../../style/valueRef';
import { hashString } from '../../../../utils/hash';
import type { CompilerOptions } from '../../../compiler/types';
import { DEFAULT_CONFIG } from '../../../utils/constants';
import {
  COMPILED_RUNTIME_VALUE,
  COMPILED_STYLE_OBJECT_LOCATIONS,
  type CompiledRuntimeValue,
  type CompiledStyleObject,
  type EvalScope,
  evaluateNode,
} from '../../evaluator/evaluator';
import type { EvalResult } from '../../evaluator/types';
import type { BabelTypes } from '../../utils/babel';
import { validateResolvedSelectorValue, validateSelectorDefinition } from '../../utils/selector';
import {
  extractStyleChain,
  STATIC_MERGE_METHOD,
  type StyleChainMethod,
  type StyleChainParseResult,
} from './extract_chain';
import type {
  CompiledChainData,
  CompiledCssItem,
  CompiledItem,
  CompiledStyleSpreadItem,
  CssExtractRule,
} from './types';

type SelectorsMap = Record<string, Selector>;

type CssConfig = {
  classNameFormat: ClassNameFormat | null;
  transformClassNameFormat: TransformClassNameFormat | null;
  hashLength: number;
  tokenNameFormat: TokenNameFormat | null;
  localClassName: boolean;
  debugClassName: boolean;
  scopeTargetPrefix: string;
};

type ExtractCssOptions = NonNullable<CompilerOptions['css']> & {
  localClassName?: boolean;
  debugClassName?: boolean;
  scopeTargetPrefix?: string;
};

type StyleChainBuilderType =
  | typeof BUILDER_TYPE_STYLE
  | typeof BUILDER_TYPE_SLOT
  | typeof BUILDER_TYPE_SLOT_OVERRIDE;

type ExtractedCssBuilderType =
  | StyleChainBuilderType
  | typeof BUILDER_TYPE_SCOPE;

type TraceCallsiteOverride = RuntimeStyleItem['callsite'];

function applyTransform(
  styleObj: Record<string, unknown>,
  transform: StyleTransform | null,
  cssConfig: CssConfig,
): Record<string, unknown> {
  if (!transform) return styleObj;

  const input = transformRuntimeValues(styleObj, transform, cssConfig);
  const transformed = transform.transform(input);

  return carryTransformedLocations(input, transformed, transform);
}

function transformRuntimeValues(
  styleObj: Record<string, unknown>,
  transform: StyleTransform,
  cssConfig: CssConfig,
): Record<string, unknown> {
  let result: Record<string, unknown> | null = null;

  for (const [property, rawValue] of Object.entries(styleObj)) {
    const value = getPriorityTupleValue(rawValue);
    const runtimeValue = getCompiledRuntimeValue(value);
    if (!runtimeValue) continue;

    const transformedRuntimeValue = transformRuntimeExpression(property, runtimeValue, transform, cssConfig);
    if (transformedRuntimeValue === runtimeValue) continue;

    result ??= cloneCompiledStyleObject(styleObj);
    result[property] = Array.isArray(rawValue) && rawValue.length === 2 && typeof rawValue[0] === 'number'
      ? [rawValue[0], createCompiledRuntimeValue(transformedRuntimeValue)]
      : createCompiledRuntimeValue(transformedRuntimeValue);
  }

  return result ?? styleObj;
}

function getPriorityTupleValue(value: unknown) {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'number'
    ? value[1]
    : value;
}

function cloneCompiledStyleObject(
  styleObj: Record<string, unknown>,
): Record<string, unknown> {
  const cloned = { ...styleObj };
  const locations = (styleObj as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];

  if (locations) {
    Object.defineProperty(cloned, COMPILED_STYLE_OBJECT_LOCATIONS, {
      configurable: true,
      enumerable: false,
      value: locations,
    });
  }

  return cloned;
}

function createCompiledRuntimeValue(
  runtimeValue: BabelTypes.Expression,
): CompiledRuntimeValue {
  return {
    [COMPILED_RUNTIME_VALUE]: runtimeValue,
  };
}

function transformRuntimeExpression(
  property: string,
  expression: BabelTypes.Expression,
  transform: StyleTransform,
  cssConfig: CssConfig,
): BabelTypes.Expression {
  if (expression.type === 'StringLiteral') {
    const transformed = transform.transform({ [property]: expression.value });
    const transformedValue = normalizeRuntimeTransformedValue(
      getSingleTransformedValue(transformed),
      cssConfig,
    );

    return createPrimitiveExpression(expression, transformedValue) ?? expression;
  }

  if (expression.type === 'ConditionalExpression') {
    const consequent = transformRuntimeExpression(
      property,
      expression.consequent as BabelTypes.Expression,
      transform,
      cssConfig,
    );
    const alternate = transformRuntimeExpression(
      property,
      expression.alternate as BabelTypes.Expression,
      transform,
      cssConfig,
    );

    return consequent === expression.consequent && alternate === expression.alternate
      ? expression
      : ({
        ...expression,
        consequent,
        alternate,
      } as BabelTypes.Expression);
  }

  return expression;
}

function getSingleTransformedValue(
  transformed: Record<string, unknown>,
) {
  const values = Object.values(transformed);
  if (!values.length) return undefined;

  return values[0];
}

function normalizeRuntimeTransformedValue(
  value: unknown,
  cssConfig: CssConfig,
) {
  if (isStyleTokenOverrideData(value)) {
    return getTokenOverrideValue(value, cssConfig.tokenNameFormat);
  }

  if (isStyleTokenData(value)) {
    return getTokenVar(value, cssConfig.tokenNameFormat);
  }

  return value;
}

function createPrimitiveExpression(
  original: BabelTypes.Expression,
  value: unknown,
): BabelTypes.Expression | null {
  if (original.type === 'StringLiteral' && value === original.value) return null;

  if (typeof value === 'string') {
    return {
      ...original,
      type: 'StringLiteral',
      value,
    } as BabelTypes.Expression;
  }

  if (typeof value === 'number') {
    return {
      ...original,
      type: 'NumericLiteral',
      value,
    } as BabelTypes.Expression;
  }

  if (typeof value === 'boolean') {
    return {
      ...original,
      type: 'BooleanLiteral',
      value,
    } as BabelTypes.Expression;
  }

  if (value === null) {
    return {
      ...original,
      type: 'NullLiteral',
    } as BabelTypes.Expression;
  }

  return null;
}

function carryTransformedLocations(
  input: Record<string, unknown>,
  transformed: Record<string, unknown>,
  transform: StyleTransform,
): Record<string, unknown> {
  const inputLocations = (input as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];
  if (!inputLocations) return transformed;

  const transformedLocations = (transformed as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];
  const locations: typeof inputLocations = {
    ...transformedLocations,
  };

  for (const [property, loc] of Object.entries(inputLocations)) {
    if (property in transformed && !locations[property]) {
      locations[property] = loc;
    }

    const single = transform.transform({ [property]: input[property] });
    for (const transformedProperty of Object.keys(single)) {
      locations[transformedProperty] ??= loc;
    }
  }

  if (!Object.keys(locations).length) return transformed;

  Object.defineProperty(transformed, COMPILED_STYLE_OBJECT_LOCATIONS, {
    configurable: true,
    enumerable: false,
    value: locations,
  });

  return transformed;
}

/**
 * Compile a parsed chain into extracted items and CSS rules.
 * Returns null if any argument cannot be statically evaluated.
 */
export function compileChain(
  chain: NonNullable<StyleChainParseResult>,
  fileId: string,
  nodeLoc: { line: number; column: number; } | null | undefined,
  scope: EvalScope,
  opts: CompilerOptions,
  meta: StyleFnMeta,
  styleNames: Set<string> = new Set(),
): CompiledChainData | null {
  const css = getCssConfig(opts);

  if (meta.mode === 'ClassName') {
    if (chain.kind !== 'style') return null;
    return compileClassNameChain(chain, meta.selectors, fileId, scope, css, meta.transform, styleNames, opts);
  }

  const selectors = meta.selectors;
  const transform = meta.transform;

  if (chain.kind === 'style') {
    return compileStyleChain(chain, selectors, fileId, scope, css, transform, styleNames, opts);
  }

  if (chain.kind === 'slot') {
    const slotId = computeSlotId(fileId, nodeLoc);
    return compileSlotChain(chain, slotId, selectors, fileId, scope, css, transform, styleNames, opts);
  }

  if (chain.kind === 'scope') {
    return compileScopeChain(chain, selectors, fileId, scope, css, transform, opts);
  }

  return null;
}

function getCssConfig(
  opts: CompilerOptions,
): CssConfig {
  const css = opts.css as ExtractCssOptions | undefined;

  return {
    classNameFormat: css?.classNameFormat ?? DEFAULT_CONFIG.classNameFormat ?? null,
    transformClassNameFormat: css?.transformClassNameFormat ?? DEFAULT_CONFIG.transformClassNameFormat ?? null,
    hashLength: css?.hashLength ?? DEFAULT_CONFIG.hashLength ?? 7,
    tokenNameFormat: css?.tokenNameFormat ?? DEFAULT_CONFIG.tokenNameFormat ?? null,
    localClassName: css?.localClassName ?? DEFAULT_CONFIG.localClassName,
    debugClassName: css?.debugClassName ?? DEFAULT_CONFIG.debugClassName,
    scopeTargetPrefix: css?.scopeTargetPrefix ?? '',
  };
}

export function computeSlotId(
  fileId: string,
  loc: { line: number; column: number; } | null | undefined,
): string {
  if (loc) {
    return hashString(fileId + '\n' + loc.line + ':' + loc.column);
  }
  return hashString(fileId + '\n' + Math.random());
}

// ─── style chain ─────────────────────────────────────────────────────────────

function compileStyleChain(
  chain: NonNullable<StyleChainParseResult>,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: StyleTransform | null,
  styleNames: Set<string>,
  options: CompilerOptions,
): CompiledChainData | null {
  const items: CompiledItem[] = [];
  const rules: CssExtractRule[] = [];

  if (
    !compileStyleChainInto(
      chain,
      selectors,
      fileId,
      scope,
      cssConfig,
      transform,
      BUILDER_TYPE_STYLE,
      null,
      null,
      items,
      rules,
      styleNames,
      options,
    )
  ) {
    return null;
  }

  return { type: 'style', items, rules };
}

function compileClassNameChain(
  chain: NonNullable<StyleChainParseResult>,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: ClassNameTransform,
  styleNames: Set<string>,
  options: CompilerOptions,
): CompiledChainData | null {
  const items: CompiledItem[] = [];
  const rules: CssExtractRule[] = [];

  if (
    !compileClassNameArgsInto(
      chain.baseArgs,
      0,
      null,
      null,
      fileId,
      scope,
      cssConfig,
      transform,
      BUILDER_TYPE_STYLE,
      null,
      items,
      rules,
    )
  ) {
    return null;
  }

  let i = 0;
  while (i < chain.methods.length) {
    const method = chain.methods[i];
    const result = compileClassNameChainMethod(
      method,
      selectors,
      fileId,
      scope,
      cssConfig,
      transform,
      items,
      rules,
      styleNames,
      options,
    );
    if (!result) return null;
    i++;
  }

  return { type: 'style', items, rules };
}

function compileClassNameChainMethod(
  method: StyleChainMethod,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: ClassNameTransform,
  items: CompiledItem[],
  rules: CssExtractRule[],
  styleNames: Set<string>,
  options: CompilerOptions,
): boolean {
  const selector = selectors[method.name];
  if (!selector) return false;
  validateSelectorDefinition(options.dev?.checkSelector, `style.${method.name}`, selector, method.nameNode);

  const selectorStr = selector.selector.trim();

  if (selectorStr === SELECTOR_MERGE) {
    const localChain = getLocalStyleChainArg(method.args[0], scope, styleNames);
    const localMeta = localChain ? scope.styleMetas?.get(localChain.rootName) : null;

    if (localChain?.kind === 'style' && localMeta?.mode === 'ClassName') {
      const result = compileClassNameChain(
        localChain,
        localMeta.selectors,
        fileId,
        scope,
        cssConfig,
        localMeta.transform,
        styleNames,
        options,
      );
      if (!result) return false;
      items.push(...result.items);
      rules.push(...result.rules);
      return true;
    }

    return false;
  }

  if (selectorStr.startsWith(SELECTOR_AT_RULE)) {
    const isMedia = selectorStr.startsWith(SELECTOR_MEDIA) || selectorStr.startsWith(SELECTOR_CONTAINER);
    const hasArg = selectorStr.includes(SELECTOR_ARGS);
    const priority = getAtRulePriority(selector.priority, isMedia, method.args[0]);
    let argOffset = 0;

    if (isMedia && isNumericLiteral(method.args[0])) {
      argOffset = 1;
    }

    let atRule = selectorStr;
    if (hasArg) {
      const queryArg = evaluateNode(method.args[argOffset], scope);
      validateResolvedSelectorValue(
        options.dev?.checkSelector,
        `style.${method.name}`,
        selector,
        queryArg,
        method.args[argOffset],
      );
      throwIfRequiredStaticSelectorValue(options, `style.${method.name}`, queryArg);
      if (!queryArg.ok) return false;

      const [before, after] = selectorStr.split(SELECTOR_ARGS);
      atRule = before + String(queryArg.value) + (after ?? '');
    }

    const atRuleSelector: ItemSelector = priority !== null ? [atRule, priority] : atRule;
    const classNameOffset = hasArg ? argOffset + 1 : argOffset;

    return compileClassNameArgsInto(
      method.args,
      classNameOffset,
      null,
      [atRuleSelector],
      fileId,
      scope,
      cssConfig,
      transform,
      BUILDER_TYPE_STYLE,
      null,
      items,
      rules,
    );
  }

  if (selectorStr.includes(SELECTOR_ARGS) || selectorStr.includes(SELECTOR_ARG)) {
    const hasArgsTemplate = selectorStr.includes(SELECTOR_ARGS);
    const splitToken = hasArgsTemplate ? SELECTOR_ARGS : SELECTOR_ARG;
    const [before, after] = selectorStr.split(splitToken);

    const selectorArg = evaluateNode(method.args[0], scope);
    validateResolvedSelectorValue(
      options.dev?.checkSelector,
      `style.${method.name}`,
      selector,
      selectorArg,
      method.args[0],
    );
    if (!selectorArg.ok) return false;

    const selectorText = before + normalizeSelectorArg(String(selectorArg.value ?? '')) + (after ?? '');
    const itemSelector: ItemSelector = selector.priority !== null ? [selectorText, selector.priority] : selectorText;

    return compileClassNameArgsInto(
      method.args,
      1,
      itemSelector,
      null,
      fileId,
      scope,
      cssConfig,
      transform,
      BUILDER_TYPE_STYLE,
      null,
      items,
      rules,
    );
  }

  const itemSelector: ItemSelector = selector.priority !== null
    ? [selectorStr, selector.priority]
    : selectorStr;

  return compileClassNameArgsInto(
    method.args,
    0,
    itemSelector,
    null,
    fileId,
    scope,
    cssConfig,
    transform,
    BUILDER_TYPE_STYLE,
    null,
    items,
    rules,
  );
}

function compileClassNameArgsInto(
  args: readonly BabelTypes.Node[],
  startIndex: number,
  selector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: ClassNameTransform,
  type: ExtractedCssBuilderType,
  slotId: string | null,
  items: CompiledItem[],
  rules: CssExtractRule[],
): boolean {
  if (startIndex >= args.length) return true;

  const styleObj: Record<string, unknown> = {};

  let i = startIndex;
  while (i < args.length) {
    const arg = evaluateNode(args[i], scope);
    if (!arg.ok) {
      throwIfRequiredStaticStyleValue(arg);
      return false;
    }

    if (!appendClassNameArgStyle(arg.value, transform, styleObj)) return false;
    i++;
  }

  return addStyleItems(
    styleObj,
    selector,
    null,
    atRules,
    fileId,
    type,
    slotId,
    items,
    rules,
    cssConfig,
  );
}

function appendClassNameArgStyle(
  value: unknown,
  transform: ClassNameTransform,
  styleObj: Record<string, unknown>,
): boolean {
  if (!value) return true;

  if (typeof value === 'string') {
    Object.assign(styleObj, decorateClassNameStyle(transform.transform(value), value));
    return true;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!appendClassNameArgStyle(item, transform, styleObj)) return false;
    }
    return true;
  }

  if (isWeightedClassName(value)) {
    const transformed = decorateClassNameStyle(transform.transform(value.className), value.className);
    Object.assign(styleObj, applyClassNameWeight(transformed, value.weight));
    return true;
  }

  return false;
}

function decorateClassNameStyle(
  style: Record<string, unknown>,
  className: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [property, value] of Object.entries(style)) {
    if (value === null || value === undefined) {
      result[property] = value;
      continue;
    }

    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
      const rawValue = value[1];
      result[property] = isClassNameValue(rawValue)
        ? value
        : [value[0], classNameValue(rawValue, className)];
      continue;
    }

    result[property] = isClassNameValue(value) ? value : classNameValue(value, className);
  }

  return result;
}

function isWeightedClassName(
  value: unknown,
): value is { className: string; weight: number; } {
  return !!value &&
    typeof value === 'object' &&
    typeof (value as { className?: unknown; }).className === 'string' &&
    typeof (value as { weight?: unknown; }).weight === 'number';
}

function applyClassNameWeight(
  style: Record<string, unknown>,
  weight: number,
): Record<string, unknown> {
  const weighted: Record<string, unknown> = {};

  for (const [property, value] of Object.entries(style)) {
    if (value === null || value === undefined) {
      weighted[property] = value;
      continue;
    }

    const rawValue = Array.isArray(value) && value.length === 2 && typeof value[0] === 'number'
      ? value[1]
      : value;

    weighted[property] = [weight, rawValue];
  }

  return weighted;
}

function compileStyleChainInto(
  chain: NonNullable<StyleChainParseResult>,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: StyleTransform | null,
  type: ExtractedCssBuilderType,
  slotId: string | null,
  atRules: ItemSelector[] | null,
  items: CompiledItem[],
  rules: CssExtractRule[],
  styleNames: Set<string>,
  options: CompilerOptions,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  if (chain.baseArgs.length > 0) {
    const styleArg = evaluateNode(chain.baseArgs[0], scope);
    if (!styleArg.ok) {
      throwIfRequiredStaticStyleValue(styleArg);
      return false;
    }
    const styleObj = applyTransform(styleArg.value as Record<string, unknown>, transform, cssConfig);
    if (
      !addStyleItems(
        styleObj,
        null,
        null,
        atRules,
        fileId,
        type,
        slotId,
        items,
        rules,
        cssConfig,
        callsiteOverride,
      )
    ) {
      return false;
    }
  }

  // Chained methods
  let i = 0;
  while (i < chain.methods.length) {
    const method = chain.methods[i];
    const result = compileChainMethod(
      method,
      selectors,
      slotId,
      fileId,
      scope,
      type,
      cssConfig,
      items,
      rules,
      transform,
      atRules,
      styleNames,
      options,
      callsiteOverride,
    );
    if (!result) return false;
    i++;
  }

  return true;
}

// ─── slot chain ──────────────────────────────────────────────────────────────

function compileSlotChain(
  chain: NonNullable<StyleChainParseResult>,
  slotId: string,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: StyleTransform | null,
  styleNames: Set<string>,
  options: CompilerOptions,
): CompiledChainData | null {
  const items: CompiledItem[] = [];
  const rules: CssExtractRule[] = [];

  // Base slot style
  if (chain.baseArgs.length > 0) {
    const styleArg = evaluateNode(chain.baseArgs[0], scope);
    if (!styleArg.ok) {
      throwIfRequiredStaticStyleValue(styleArg);
      return null;
    }
    const styleObj = applyTransform(styleArg.value as Record<string, unknown>, transform, cssConfig);
    if (!addStyleItems(styleObj, null, null, null, fileId, BUILDER_TYPE_SLOT, slotId, items, rules, cssConfig)) {
      return null;
    }
  }

  // Chained methods
  let i = 0;
  while (i < chain.methods.length) {
    const method = chain.methods[i];
    const result = compileChainMethod(
      method,
      selectors,
      slotId,
      fileId,
      scope,
      BUILDER_TYPE_SLOT,
      cssConfig,
      items,
      rules,
      transform,
      null,
      styleNames,
      options,
    );
    if (!result) return null;
    i++;
  }

  return { type: 'slot', slotId, items, rules };
}

// ─── scope chain ─────────────────────────────────────────────────────────────

function compileScopeChain(
  chain: NonNullable<StyleChainParseResult>,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: StyleTransform | null,
  options: CompilerOptions,
  callsiteOverride: TraceCallsiteOverride = null,
): CompiledChainData | null {
  const items: CompiledItem[] = [];
  const rules: CssExtractRule[] = [];

  if (chain.baseArgs.length > 0) {
    if (
      !compileScopeItemsArg(
        chain.baseArgs[0],
        null,
        null,
        selectors,
        fileId,
        scope,
        cssConfig,
        items,
        rules,
        transform,
        options,
        callsiteOverride,
      )
    ) {
      return null;
    }
  }

  // Scope methods (media, container, etc.)
  let i = 0;
  while (i < chain.methods.length) {
    const method = chain.methods[i];
    const result = compileScopeMethod(
      method,
      selectors,
      fileId,
      scope,
      cssConfig,
      items,
      rules,
      transform,
      options,
      callsiteOverride,
    );
    if (!result) return null;
    i++;
  }

  return { type: 'scope', items, rules };
}

function compileScopeMethod(
  method: { name: string; args: BabelTypes.Node[]; nameNode?: BabelTypes.Node; },
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  options: CompilerOptions,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  const selector = selectors[method.name];
  if (!selector) return false;
  validateSelectorDefinition(options.dev?.checkSelector, `style.${method.name}`, selector, method.nameNode);

  const selectorStr = selector.selector.trim();

  if (selectorStr === SELECTOR_MERGE) {
    const mergeCallsite = callsiteOverride ?? getMergeStyleCallsite(method.nameNode, scope, options);
    const localChain = getLocalStyleChainArg(method.args[0], scope, scope.styleNames ?? new Set());
    const localMeta = localChain ? scope.styleMetas?.get(localChain.rootName) : null;

    if (mergeCallsite && localChain?.kind === 'scope' && localMeta) {
      const result = compileScopeChain(
        localChain,
        localMeta.selectors,
        fileId,
        scope,
        cssConfig,
        localMeta.transform,
        options,
        mergeCallsite,
      );
      if (!result) return false;
      items.push(...result.items);
      cssRules.push(...result.rules);
      return true;
    }

    const localSlotOverride = getLocalBindingNode(method.args[0], scope);
    if (
      mergeCallsite &&
      localSlotOverride &&
      compileScopeItemsArg(
        localSlotOverride,
        null,
        null,
        selectors,
        fileId,
        scope,
        cssConfig,
        items,
        cssRules,
        transform,
        options,
        mergeCallsite,
      )
    ) {
      return true;
    }

    const scopeArg = evaluateNode(method.args[0], scope);
    if (!scopeArg.ok) return false;

    return addScopeDataItems(
      scopeArg.value,
      null,
      null,
      fileId,
      items,
      cssRules,
      cssConfig,
      mergeCallsite,
    );
  }

  if (selectorStr.startsWith(SELECTOR_AT_RULE)) {
    // At-rule scope method: media('(max-width: 900px)', [...items])
    const isMedia = selectorStr.startsWith(SELECTOR_MEDIA) || selectorStr.startsWith(SELECTOR_CONTAINER);
    const hasArg = selectorStr.includes(SELECTOR_ARGS);

    const priority = getAtRulePriority(selector.priority, isMedia, method.args[0]);
    let argOffset = 0;
    if (isMedia && isNumericLiteral(method.args[0])) {
      argOffset = 1; // skip priority arg
    }

    let atRule = selectorStr;
    if (hasArg) {
      const queryArg = evaluateNode(method.args[argOffset], scope);
      validateResolvedSelectorValue(
        options.dev?.checkSelector,
        `style.${method.name}`,
        selector,
        queryArg,
        method.args[argOffset],
      );
      throwIfRequiredStaticSelectorValue(options, `style.${method.name}`, queryArg);
      if (!queryArg.ok) return false;

      const [before, after] = selectorStr.split(SELECTOR_ARGS);
      atRule = before + String(queryArg.value) + (after ?? '');
    }

    const atRuleSelector: ItemSelector = priority !== null
      ? [atRule, priority]
      : atRule;

    const itemsArg = method.args[hasArg ? argOffset + 1 : argOffset];
    if (!itemsArg) return false;

    return compileScopeItemsArg(
      itemsArg,
      null,
      [atRuleSelector],
      selectors,
      fileId,
      scope,
      cssConfig,
      items,
      cssRules,
      transform,
      options,
      callsiteOverride,
    );
  }

  if (selectorStr.includes(SELECTOR_ARGS) || selectorStr.includes(SELECTOR_ARG)) {
    const hasArgsTemplate = selectorStr.includes(SELECTOR_ARGS);
    const splitToken = hasArgsTemplate ? SELECTOR_ARGS : SELECTOR_ARG;
    const [before, after] = selectorStr.split(splitToken);

    const selectorArg = evaluateNode(method.args[0], scope);
    validateResolvedSelectorValue(
      options.dev?.checkSelector,
      `style.${method.name}`,
      selector,
      selectorArg,
      method.args[0],
    );
    if (!selectorArg.ok) return false;

    const itemsArg = method.args[1];
    if (!itemsArg) return false;

    const selectorValues = Array.isArray(selectorArg.value)
      ? selectorArg.value
      : [selectorArg.value];

    let i = 0;
    while (i < selectorValues.length) {
      const itemSelectorValue = selectorValues[i];
      const selectorText = before + normalizeSelectorArg(String(itemSelectorValue ?? '')) + (after ?? '');
      const parentSelector: ItemSelector = selector.priority !== null
        ? [selectorText, selector.priority]
        : selectorText;

      if (
        !compileScopeItemsArg(
          itemsArg,
          parentSelector,
          null,
          selectors,
          fileId,
          scope,
          cssConfig,
          items,
          cssRules,
          transform,
          options,
          callsiteOverride,
        )
      ) {
        return false;
      }

      i++;
    }

    return true;
  }

  const parentSelector: ItemSelector = selector.priority !== null
    ? [selectorStr, selector.priority]
    : selectorStr;

  return compileScopeItemsArg(
    method.args[0],
    parentSelector,
    null,
    selectors,
    fileId,
    scope,
    cssConfig,
    items,
    cssRules,
    transform,
    options,
    callsiteOverride,
  );
}

function compileScopeItemsArg(
  itemsArg: BabelTypes.Node,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  options: CompilerOptions,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  if (itemsArg.type === 'ArrayExpression') {
    let i = 0;
    while (i < itemsArg.elements.length) {
      const el = itemsArg.elements[i];
      if (!el) {
        i++;
        continue;
      }

      const overrideResult = resolveSlotOverrideNode(
        el as BabelTypes.Node,
        parentSelector,
        atRules,
        selectors,
        fileId,
        scope,
        cssConfig,
        items,
        cssRules,
        transform,
        options,
        callsiteOverride,
      );
      if (!overrideResult) return false;
      i++;
    }
  } else {
    const overrideResult = resolveSlotOverrideNode(
      itemsArg,
      parentSelector,
      atRules,
      selectors,
      fileId,
      scope,
      cssConfig,
      items,
      cssRules,
      transform,
      options,
      callsiteOverride,
    );
    if (!overrideResult) return false;
  }

  return true;
}

function resolveSlotOverrideNode(
  node: BabelTypes.Node,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  options: CompilerOptions,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  const tokenOverride = evaluateNode(node, scope);

  if (tokenOverride.ok && isStyleTokenOverrideData(tokenOverride.value)) {
    addCompiledTokenItem(
      getStyleTokenId(tokenOverride.value),
      tokenOverride.value,
      getCompiledRuntimeValue(tokenOverride.value) ?? node as BabelTypes.Expression,
      items,
    );
    return true;
  }

  // Must be a call expression: slotRef({ ... }) or slotRef().method(...)
  if (node.type !== 'CallExpression') return false;

  // Extract the call chain to find the slot reference
  const overrideChain = extractOverrideChain(node, selectors, scope, fileId, cssConfig, transform, options);
  if (!overrideChain) return false;

  const { slotId, items: overrideItems } = overrideChain;

  // Add the scope items
  let i = 0;
  while (i < overrideItems.length) {
    const overrideItem = overrideItems[i];
    const mergedAtRules = mergeAtRules(atRules, overrideItem.atRules);

    if (overrideItem.chain && overrideItem.meta?.mode === 'StyleObject') {
      if (
        !compileStyleChainInto(
          overrideItem.chain,
          overrideItem.meta.selectors,
          fileId,
          scope,
          cssConfig,
          overrideItem.meta.transform,
          BUILDER_TYPE_SCOPE,
          slotId,
          mergedAtRules,
          items,
          cssRules,
          scope.styleNames ?? new Set(),
          options,
          overrideItem.callsiteOverride,
        )
      ) {
        return false;
      }
    } else if (overrideItem.styleData !== undefined) {
      if (
        !addStyleDataItems(
          overrideItem.styleData,
          overrideItem.selector,
          parentSelector,
          mergedAtRules,
          fileId,
          BUILDER_TYPE_SCOPE,
          slotId,
          items,
          cssRules,
          cssConfig,
          overrideItem.callsiteOverride,
        )
      ) {
        return false;
      }
    } else if (
      !addStyleItems(
        overrideItem.styleObj,
        overrideItem.selector,
        parentSelector,
        mergedAtRules,
        fileId,
        BUILDER_TYPE_SCOPE,
        slotId,
        items,
        cssRules,
        cssConfig,
        overrideItem.callsiteOverride ?? callsiteOverride,
      )
    ) {
      return false;
    }

    i++;
  }

  return true;
}

type OverrideItem = {
  styleObj: CompiledStyleObject;
  styleData?: unknown;
  chain?: NonNullable<StyleChainParseResult>;
  meta?: StyleFnMeta;
  selector: ItemSelector | null;
  atRules: ItemSelector[] | null;
  callsiteOverride?: TraceCallsiteOverride;
};

type OverrideChain = {
  slotId: string;
  items: OverrideItem[];
};

function extractOverrideChain(
  node: BabelTypes.CallExpression,
  selectors: SelectorsMap,
  scope: EvalScope,
  fileId: string,
  cssConfig: CssConfig,
  transform: StyleTransform | null,
  options: CompilerOptions,
): OverrideChain | null {
  // Pattern 1: slotRef({ ... }) — direct call with override object
  // Pattern 2: slotRef().hover({ ... }) — empty call then method chain
  // Pattern 3: slotRef({ ... }).hover({ ... }) — call with base then method chain

  const callee = node.callee;

  if (callee.type === 'MemberExpression' && !callee.computed) {
    // slotRef.method() or slotRef(...).method(...)
    const methodName = (callee.property as BabelTypes.Identifier).name;
    const obj = callee.object;

    if (obj.type === 'CallExpression') {
      const inner = extractOverrideChain(obj, selectors, scope, fileId, cssConfig, transform, options);
      if (!inner) return null;

      const overrideItem = resolveOverrideMethod(
        methodName,
        node.arguments as BabelTypes.Node[],
        callee.property as BabelTypes.Node,
        selectors,
        scope,
        cssConfig,
        transform,
        options,
      );
      if (!overrideItem) return null;

      return {
        slotId: inner.slotId,
        items: inner.items.concat(overrideItem),
      };
    }
  }

  // Direct call: slotRef(...) where slotRef is a slot identifier
  const slotId = resolveSlotId(callee, scope, fileId);
  if (!slotId) return null;

  const items: OverrideItem[] = [];
  if (node.arguments.length > 0) {
    const styleArg = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
    if (!styleArg.ok) return null;
    items.push({
      styleObj: applyTransform((styleArg.value as Record<string, unknown>) ?? {}, transform, cssConfig),
      selector: null,
      atRules: null,
    });
  }

  return { slotId, items };
}

function resolveOverrideMethod(
  methodName: string,
  args: BabelTypes.Node[],
  nameNode: BabelTypes.Node | undefined,
  selectors: SelectorsMap,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: StyleTransform | null,
  options: CompilerOptions,
): OverrideItem | null {
  const sel = selectors[methodName];
  if (!sel) return null;
  validateSelectorDefinition(options.dev?.checkSelector, `style.${methodName}`, sel);

  const selectorStr = sel.selector.trim();

  if (selectorStr === SELECTOR_MERGE) {
    const styleArg = evaluateNode(args[0], scope);
    if (!styleArg.ok) return null;

    const callsiteOverride = getMergeStyleCallsite(nameNode, scope, options);
    const localChain = getLocalStyleChainArg(args[0], scope, scope.styleNames ?? new Set());
    const localMeta = localChain ? scope.styleMetas?.get(localChain.rootName) : null;

    if (localChain?.kind === 'style' && localMeta) {
      return {
        styleObj: {},
        chain: localChain,
        meta: localMeta,
        selector: null,
        atRules: null,
        callsiteOverride,
      };
    }

    if (isStyleData(styleArg.value)) {
      return {
        styleObj: {},
        styleData: styleArg.value,
        selector: null,
        atRules: null,
        callsiteOverride,
      };
    }

    return {
      styleObj: applyTransform((styleArg.value as Record<string, unknown>) ?? {}, transform, cssConfig),
      selector: null,
      atRules: null,
      callsiteOverride,
    };
  }

  if (selectorStr.startsWith(SELECTOR_AT_RULE)) {
    const isMedia = selectorStr.startsWith(SELECTOR_MEDIA) || selectorStr.startsWith(SELECTOR_CONTAINER);
    const hasArg = selectorStr.includes(SELECTOR_ARGS);

    const priority = getAtRulePriority(sel.priority, isMedia, args[0]);
    let argOffset = 0;
    if (isMedia && isNumericLiteral(args[0])) {
      argOffset = 1;
    }

    let atRule = selectorStr;
    if (hasArg) {
      const queryArg = evaluateNode(args[argOffset], scope);
      validateResolvedSelectorValue(options.dev?.checkSelector, `style.${methodName}`, sel, queryArg, args[argOffset]);
      throwIfRequiredStaticSelectorValue(options, `style.${methodName}`, queryArg);
      if (!queryArg.ok) return null;

      const [before, after] = selectorStr.split(SELECTOR_ARGS);
      atRule = before + String(queryArg.value) + (after ?? '');
    }

    const styleArg = evaluateNode(args[hasArg ? argOffset + 1 : argOffset], scope);
    if (!styleArg.ok) return null;

    const atRuleSelector: ItemSelector = priority !== null ? [atRule, priority] : atRule;

    return {
      styleObj: applyTransform(styleArg.value as Record<string, unknown>, transform, cssConfig),
      selector: null,
      atRules: [atRuleSelector],
    };
  }

  if (selectorStr.includes(SELECTOR_ARGS) || selectorStr.includes(SELECTOR_ARG)) {
    const hasArgsTemplate = selectorStr.includes(SELECTOR_ARGS);
    const splitToken = hasArgsTemplate ? SELECTOR_ARGS : SELECTOR_ARG;
    const [before, after] = selectorStr.split(splitToken);

    const selectorArg = evaluateNode(args[0], scope);
    validateResolvedSelectorValue(options.dev?.checkSelector, `style.${methodName}`, sel, selectorArg, args[0]);
    if (!selectorArg.ok) return null;

    const styleArg = evaluateNode(args[1], scope);
    if (!styleArg.ok) return null;

    const selectorText = before + normalizeSelectorArg(String(selectorArg.value ?? '')) + (after ?? '');
    const itemSelector: ItemSelector = sel.priority !== null ? [selectorText, sel.priority] : selectorText;

    return {
      styleObj: applyTransform(styleArg.value as Record<string, unknown>, transform, cssConfig),
      selector: itemSelector,
      atRules: null,
    };
  }

  const styleArg = evaluateNode(args[0], scope);
  if (!styleArg.ok) return null;

  return {
    styleObj: applyTransform(styleArg.value as Record<string, unknown>, transform, cssConfig),
    selector: sel.priority !== null ? [selectorStr, sel.priority] : selectorStr,
    atRules: null,
  };
}

function mergeAtRules(
  scopeAtRules: ItemSelector[] | null,
  overrideAtRules: ItemSelector[] | null,
): ItemSelector[] | null {
  if (!scopeAtRules) return overrideAtRules;
  if (!overrideAtRules) return scopeAtRules;
  return scopeAtRules.concat(overrideAtRules);
}

function resolveSlotId(
  node: BabelTypes.Node,
  scope: EvalScope,
  _fileId: string,
): string | null {
  // Identifier: direct local slot reference
  if (node.type === 'Identifier') {
    const slotRef = scope.bindings.get(node.name);
    const localSlotId = getSlotIdFromEval(slotRef);
    if (localSlotId) {
      return localSlotId;
    }

    const imp = scope.imports.get(node.name);
    if (imp) {
      const exported = scope.resolveImport(imp.source, scope.filePath);
      const exportedRef = exported?.get(imp.name);
      const importedSlotId = getSlotIdFromEval(exportedRef);
      if (importedSlotId) {
        return importedSlotId;
      }
    }

    return null;
  }

  // MemberExpression: obj.prop (e.g., fluenticStyles.panelSlot)
  if (node.type === 'MemberExpression' && !node.computed) {
    const prop = (node.property as BabelTypes.Identifier).name;
    const obj = node.object;

    if (obj.type === 'Identifier') {
      const objVal = scope.bindings.get(obj.name);
      if (!objVal) {
        // Try resolving from imports
        const imp = scope.imports.get(obj.name);
        if (imp) {
          const exported = scope.resolveImport(imp.source, scope.filePath);
          if (exported) {
            const exportedObj = exported.get(imp.name);
            const directSlotId = getSlotIdFromEval(exportedObj);
            if (directSlotId) {
              return directSlotId;
            }
            if (exportedObj?.ok && exportedObj.value && typeof exportedObj.value === 'object') {
              const slotRef = (exportedObj.value as any)[prop];
              const slotId = getSlotIdFromValue(slotRef);
              if (slotId) return slotId;
            }
          }
        }
        return null;
      }

      if (objVal.ok && objVal.value && typeof objVal.value === 'object') {
        const slotRef = (objVal.value as any)[prop];
        const slotId = getSlotIdFromValue(slotRef);
        if (slotId) return slotId;
      }
    }
  }

  return null;
}

function getSlotIdFromEval(value: EvalResult | undefined): string | null {
  if (!value) return null;
  if (value.ok) return getSlotIdFromValue(value.value);
  return getSlotIdFromValue(value);
}

function getSlotIdFromValue(value: unknown): string | null {
  if (typeof value !== 'object' || !value) return null;
  const slotId = (value as { slotId?: unknown; }).slotId;
  return typeof slotId === 'string' ? slotId : null;
}

// ─── common method compiler ───────────────────────────────────────────────────

function compileChainMethod(
  method: { name: string; args: BabelTypes.Node[]; nameNode?: BabelTypes.Node; },
  selectors: SelectorsMap,
  slotId: string | null,
  fileId: string,
  scope: EvalScope,
  type: ExtractedCssBuilderType,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  atRules: ItemSelector[] | null,
  styleNames: Set<string>,
  options: CompilerOptions,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  if (method.name === STATIC_MERGE_METHOD) {
    const mergeCallsite = callsiteOverride ?? getMergeStyleCallsite(method.nameNode, scope, options);
    return compileMergeArg(
      method.args[0],
      method.nameNode,
      fileId,
      scope,
      type,
      slotId,
      atRules,
      cssConfig,
      items,
      cssRules,
      styleNames,
      options,
      mergeCallsite,
    );
  }

  const selector = selectors[method.name];
  if (!selector) return false;
  validateSelectorDefinition(options.dev?.checkSelector, `style.${method.name}`, selector, method.nameNode);

  const selectorStr = selector.selector.trim();

  if (selectorStr === SELECTOR_MERGE) {
    const mergeCallsite = callsiteOverride ?? getMergeStyleCallsite(method.nameNode, scope, options);
    return compileMergeArg(
      method.args[0],
      method.nameNode,
      fileId,
      scope,
      type,
      slotId,
      atRules,
      cssConfig,
      items,
      cssRules,
      styleNames,
      options,
      mergeCallsite,
    );
  }

  if (selectorStr.startsWith(SELECTOR_AT_RULE)) {
    return compileAtRuleMethod(
      method,
      slotId,
      selector,
      selectorStr,
      fileId,
      scope,
      type,
      cssConfig,
      items,
      cssRules,
      transform,
      atRules,
      selectors,
      styleNames,
      options,
    );
  }

  // Simple selector (pseudo class etc.)
  if (selectorStr.includes(SELECTOR_ARGS) || selectorStr.includes(SELECTOR_ARG)) {
    return compileArgMethod(
      method,
      selector,
      slotId,
      fileId,
      scope,
      type,
      cssConfig,
      items,
      cssRules,
      transform,
      atRules,
      options,
    );
  }

  const itemSelector: ItemSelector = selector.priority !== null
    ? [selectorStr, selector.priority]
    : selectorStr;

  const styleArg = evaluateNode(method.args[0], scope);
  if (!styleArg.ok) {
    throwIfRequiredStaticStyleValue(styleArg);
    return false;
  }
  const styleObj = applyTransform(styleArg.value as Record<string, unknown>, transform, cssConfig);

  return addStyleItems(
    styleObj,
    itemSelector,
    null,
    atRules,
    fileId,
    type,
    slotId,
    items,
    cssRules,
    cssConfig,
    callsiteOverride,
  );
}

function compileMergeArg(
  styleArgNode: BabelTypes.Node | undefined,
  mergeNode: BabelTypes.Node | undefined,
  fileId: string,
  scope: EvalScope,
  type: ExtractedCssBuilderType,
  slotId: string | null,
  atRules: ItemSelector[] | null,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  styleNames: Set<string>,
  options: CompilerOptions,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  if (!styleArgNode) return false;
  const styleCallsite = callsiteOverride ?? getMergeStyleCallsite(mergeNode, scope, options);
  const localChain = getLocalStyleChainArg(styleArgNode, scope, styleNames);
  const localMeta = localChain ? scope.styleMetas?.get(localChain.rootName) : null;

  if ((styleCallsite || options.dev?.sourcemapMode === 'value') && localChain?.kind === 'style' && localMeta) {
    return compileStyleChainInto(
      localChain,
      localMeta.selectors,
      fileId,
      scope,
      cssConfig,
      localMeta.transform,
      type,
      slotId,
      atRules,
      items,
      cssRules,
      styleNames,
      options,
      styleCallsite,
    );
  }

  if (styleArgNode.type === 'CallExpression') {
    const nestedChain = extractStyleChain(styleArgNode, styleNames);
    const nestedMeta = nestedChain ? scope.styleMetas?.get(nestedChain.rootName) : null;

    if (nestedChain?.kind === 'style' && nestedMeta) {
      return compileStyleChainInto(
        nestedChain,
        nestedMeta.selectors,
        fileId,
        scope,
        cssConfig,
        nestedMeta.transform,
        type,
        slotId,
        atRules,
        items,
        cssRules,
        styleNames,
        options,
        styleCallsite,
      );
    }
  }

  const styleArg = evaluateNode(styleArgNode, scope);
  if (!styleArg.ok) {
    throwIfRequiredStaticStyleValue(styleArg);
    return false;
  }

  if (isStyleData(styleArg.value) && isStyleDataSpreadExpression(styleArgNode)) {
    return addStyleDataSpreadItems(
      styleArg.value,
      styleArgNode,
      null,
      null,
      atRules,
      fileId,
      type,
      slotId,
      items,
      cssRules,
      cssConfig,
      styleCallsite,
    );
  }

  return addStyleDataItems(
    styleArg.value,
    null,
    null,
    atRules,
    fileId,
    type,
    slotId,
    items,
    cssRules,
    cssConfig,
    styleCallsite,
  );
}

function getLocalStyleChainArg(
  node: BabelTypes.Node,
  scope: EvalScope,
  styleNames: Set<string>,
) {
  if (node.type !== 'Identifier') return null;

  const init = scope.bindingNodes?.get(node.name);
  if (!init) return null;

  return extractStyleChain(init, styleNames);
}

function getLocalBindingNode(
  node: BabelTypes.Node | undefined,
  scope: EvalScope,
) {
  return node?.type === 'Identifier'
    ? scope.bindingNodes?.get(node.name) ?? null
    : null;
}

function getMergeStyleCallsite(
  node: BabelTypes.Node | undefined,
  scope: EvalScope,
  options: CompilerOptions,
): TraceCallsiteOverride {
  if (options.dev?.sourcemapMode !== 'style') return null;

  const loc = node?.loc?.start;
  if (!loc) return null;

  return {
    stack: '',
    filePath: scope.styleFilePath ?? scope.filePath,
    line: loc.line,
    column: loc.column + 1,
  };
}

function isStyleDataSpreadExpression(
  node: BabelTypes.Node,
): node is BabelTypes.Expression {
  switch (node.type) {
    case 'Identifier':
    case 'MemberExpression':
    case 'OptionalMemberExpression':
    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
      return true;
    default:
      return false;
  }
}

function compileAtRuleMethod(
  method: { name: string; args: BabelTypes.Node[]; nameNode?: BabelTypes.Node; },
  slotId: string | null,
  selector: Selector,
  selectorStr: string,
  fileId: string,
  scope: EvalScope,
  type: ExtractedCssBuilderType,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  atRules: ItemSelector[] | null,
  selectors: SelectorsMap,
  styleNames: Set<string>,
  options: CompilerOptions,
): boolean {
  const isMedia = selectorStr.startsWith(SELECTOR_MEDIA) || selectorStr.startsWith(SELECTOR_CONTAINER);
  const hasArg = selectorStr.includes(SELECTOR_ARGS);
  validateSelectorDefinition(options.dev?.checkSelector, `style.${method.name}`, selector, method.nameNode);

  const priority = getAtRulePriority(selector.priority, isMedia, method.args[0]);
  let argOffset = 0;
  if (isMedia && isNumericLiteral(method.args[0])) {
    argOffset = 1;
  }

  let atRule = selectorStr;
  if (hasArg) {
    const queryArg = evaluateNode(method.args[argOffset], scope);
    validateResolvedSelectorValue(
      options.dev?.checkSelector,
      `style.${method.name}`,
      selector,
      queryArg,
      method.args[argOffset],
    );
    throwIfRequiredStaticSelectorValue(options, `style.${method.name}`, queryArg);
    if (!queryArg.ok) return false;

    const [before, after] = selectorStr.split(SELECTOR_ARGS);
    atRule = before + String(queryArg.value) + (after ?? '');
  }

  const atRuleSelector: ItemSelector = priority !== null ? [atRule, priority] : atRule;
  const nextAtRules = mergeAtRules(atRules, [atRuleSelector]);

  const styleArg = method.args[hasArg ? argOffset + 1 : argOffset];
  if (!styleArg) return false;

  // Style arg can be a StyleData reference (style({...})) or plain object
  if (styleArg.type === 'CallExpression') {
    // Nested style() call
    const nestedChain = extractStyleChain(styleArg, styleNames);
    const nestedMeta = nestedChain ? scope.styleMetas?.get(nestedChain.rootName) : null;
    if (nestedChain?.kind === 'style' && nestedMeta) {
      return compileStyleChainInto(
        nestedChain,
        nestedMeta.selectors,
        fileId,
        scope,
        cssConfig,
        nestedMeta.transform,
        type,
        slotId,
        nextAtRules,
        items,
        cssRules,
        styleNames,
        options,
      );
    }
    // Could not parse as chain — try to evaluate as static object
    const evaled = evaluateNode(styleArg, scope);
    if (!evaled.ok) {
      throwIfRequiredStaticStyleValue(evaled);
      return false;
    }
    return addStyleItems(
      applyTransform(evaled.value as Record<string, unknown>, transform, cssConfig),
      null,
      null,
      nextAtRules,
      fileId,
      type,
      slotId,
      items,
      cssRules,
      cssConfig,
    );
  }

  const styleResult = evaluateNode(styleArg, scope);
  if (!styleResult.ok) {
    throwIfRequiredStaticStyleValue(styleResult);
    return false;
  }

  return addStyleItems(
    applyTransform(styleResult.value as Record<string, unknown>, transform, cssConfig),
    null,
    null,
    nextAtRules,
    fileId,
    type,
    slotId,
    items,
    cssRules,
    cssConfig,
  );
}

function compileArgMethod(
  method: { name: string; args: BabelTypes.Node[]; nameNode?: BabelTypes.Node; },
  selector: Selector,
  slotId: string | null,
  fileId: string,
  scope: EvalScope,
  type: ExtractedCssBuilderType,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  atRules: ItemSelector[] | null,
  options: CompilerOptions,
): boolean {
  const selectorStr = selector.selector.trim();
  validateSelectorDefinition(options.dev?.checkSelector, `style.${method.name}`, selector, method.nameNode);
  const hasArgsTemplate = selectorStr.includes(SELECTOR_ARGS);
  const splitToken = hasArgsTemplate ? SELECTOR_ARGS : SELECTOR_ARG;
  const [before, after] = selectorStr.split(splitToken);
  const argIndex = 0;
  const styleIndex = 1;

  const argNode = method.args[argIndex];
  const styleArg = method.args[styleIndex];
  if (!argNode || !styleArg) return false;

  const selectorArg = evaluateNode(argNode, scope);
  validateResolvedSelectorValue(options.dev?.checkSelector, `style.${method.name}`, selector, selectorArg, argNode);
  throwIfRequiredStaticSelectorValue(options, `style.${method.name}`, selectorArg);
  if (!selectorArg.ok) return false;

  const styleResult = evaluateNode(styleArg, scope);
  if (!styleResult.ok) return false;

  const selectorValues = Array.isArray(selectorArg.value)
    ? selectorArg.value
    : [selectorArg.value];

  const styleObj = applyTransform(styleResult.value as Record<string, unknown>, transform, cssConfig);

  let i = 0;
  while (i < selectorValues.length) {
    const itemSelectorValue = selectorValues[i];
    const selectorText = before + normalizeSelectorArg(String(itemSelectorValue ?? '')) + (after ?? '');
    const compiledSelector: ItemSelector = selector.priority !== null
      ? [selectorText, selector.priority]
      : selectorText;

    if (!addStyleItems(styleObj, compiledSelector, null, atRules, fileId, type, slotId, items, cssRules, cssConfig)) {
      return false;
    }

    i++;
  }

  return true;
}

function isNumericLiteral(node: BabelTypes.Node | undefined): node is BabelTypes.NumericLiteral {
  return node?.type === 'NumericLiteral';
}

function addScopeDataItems(
  value: unknown,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  cssConfig: CssConfig,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  const values = Array.isArray(value) ? value : [value];

  let i = 0;
  while (i < values.length) {
    const scopeData = values[i];
    if (isSlotOverrideData(scopeData)) {
      if (
        !addSlotOverrideDataItems(
          scopeData,
          parentSelector,
          atRules,
          fileId,
          items,
          cssRules,
          cssConfig,
          callsiteOverride,
        )
      ) {
        return false;
      }

      i++;
      continue;
    }

    if (!isScopeData(scopeData)) return false;

    const sourceItems = scopeData[BUILDER_STATE].items;

    let j = 0;
    while (j < sourceItems.length) {
      const sourceItem = sourceItems[j];

      if (Array.isArray(sourceItem)) {
        addExtractedScopeItem(sourceItem, items);
        j++;
        continue;
      }

      if (isStyleTokenOverrideData(sourceItem)) {
        addCompiledTokenItem(
          getStyleTokenId(sourceItem),
          sourceItem,
          getCompiledRuntimeValue(sourceItem) ?? null,
          items,
        );
        j++;
        continue;
      }

      if (sourceItem.type !== BUILDER_TYPE_SCOPE) {
        return false;
      }

      addRuntimeScopeItem(
        sourceItem,
        parentSelector,
        atRules,
        fileId,
        items,
        cssRules,
        cssConfig,
        callsiteOverride,
      );

      j++;
    }

    i++;
  }

  return true;
}

function addSlotOverrideDataItems(
  value: unknown,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  cssConfig: CssConfig,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  const values = Array.isArray(value) ? value : [value];

  let i = 0;
  while (i < values.length) {
    const slotOverrideData = values[i];
    if (!isSlotOverrideData(slotOverrideData)) return false;

    const slotId = slotOverrideData[BUILDER_SLOT_ID];
    const sourceItems = slotOverrideData[BUILDER_STATE].items;

    let j = 0;
    while (j < sourceItems.length) {
      const sourceItem = sourceItems[j];

      if (Array.isArray(sourceItem)) {
        addExtractedScopeItem(sourceItem, items);
        j++;
        continue;
      }

      if (isStyleTokenOverrideData(sourceItem) || sourceItem.type !== BUILDER_TYPE_SLOT_OVERRIDE) {
        return false;
      }

      const overrideItem = sourceItem as RuntimeSlotOverrideItem;
      const scopeItem: RuntimeScopeItem = {
        type: BUILDER_TYPE_SCOPE,
        slotId,
        runtime: overrideItem.runtime,
        callsite: overrideItem.callsite,
        debug: overrideItem.debug,
        debugField: overrideItem.debugField,
        dedupe: overrideItem.dedupe,
        className: overrideItem.className,
        property: overrideItem.property,
        value: overrideItem.value,
        variable: overrideItem.variable,
        token: overrideItem.token,
        selector: overrideItem.selector,
        atRule: overrideItem.atRule,
        parentSelector,
      };

      addRuntimeScopeItem(
        scopeItem,
        parentSelector,
        atRules,
        fileId,
        items,
        cssRules,
        cssConfig,
        callsiteOverride,
      );

      j++;
    }

    i++;
  }

  return true;
}

function addCompiledTokenItem(
  tokenId: string,
  value: StyleTokenOverride,
  valueNode: BabelTypes.Expression | null,
  items: CompiledItem[],
) {
  if (!valueNode) return false;

  const item: CompiledItem = {
    kind: 'token',
    tokenId,
    value,
    valueNode,
  };

  let i = items.length - 1;
  while (i >= 0) {
    const current = items[i];
    if (!Array.isArray(current) && current.kind === 'token' && current.tokenId === tokenId) {
      items[i] = item;
      return true;
    }
    i--;
  }

  items.push(item);
  return true;
}

function addExtractedScopeItem(
  sourceItem: unknown[],
  items: CompiledItem[],
) {
  const slotId = String(sourceItem[1]);
  const dedupe = String(sourceItem[2]);
  const className = String(sourceItem[3]);
  const value = sourceItem[4];
  const hasParentSelector = value === true || value === 1 || sourceItem[5] === true || sourceItem[5] === 1;

  const item = createCompiledItem(BUILDER_TYPE_SCOPE, slotId, dedupe, className, hasParentSelector);

  if (value !== undefined && value !== true && value !== 1) {
    setCompiledItemValue(item, value as ExtractedItemValue);
  }

  items.push(item);
}

function addRuntimeScopeItem(
  sourceItem: RuntimeScopeItem,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  cssConfig: CssConfig,
  callsiteOverride: TraceCallsiteOverride = null,
) {
  let priority: number | null = null;
  let value = sourceItem.value;

  if (Array.isArray(value)) {
    priority = value[1];
    value = value[0];
  }

  const itemParentSelector = parentSelector ?? sourceItem.parentSelector;
  const itemAtRules = mergeAtRules(atRules, sourceItem.atRule);
  const traceCallsite = callsiteOverride ?? sourceItem.callsite;
  const valueStr = String(value ?? '');

  const dedupe = getClassNameDedupe(
    sourceItem.property,
    priority,
    sourceItem.selector,
    itemParentSelector,
    itemAtRules,
  );

  const className = getAtomicClassName(
    sourceItem.property,
    priority,
    valueStr,
    sourceItem.selector,
    itemParentSelector,
    itemAtRules,
    traceCallsite,
    cssConfig.localClassName,
    cssConfig.debugClassName,
    cssConfig.classNameFormat,
    sourceItem.transformClassName ?? null,
    cssConfig.transformClassNameFormat,
    cssConfig.hashLength,
  );

  const item: CompiledItem = createCompiledItem(
    BUILDER_TYPE_SCOPE,
    sourceItem.slotId,
    dedupe,
    className,
    !!itemParentSelector,
  );

  items.push(item);

  const css = buildAtomicRule(
    className,
    sourceItem.property,
    valueStr,
    sourceItem.selector,
    itemParentSelector,
    itemAtRules,
    cssConfig.scopeTargetPrefix,
  );

  const layerPriority = getAtomicRuleLayerPriority(
    sourceItem.property,
    priority,
    sourceItem.selector,
    itemParentSelector,
    itemAtRules,
    true,
  );

  cssRules.push({
    dedupe,
    className,
    css,
    priority: layerPriority,
    trace: traceCallsite
      ? {
        filePath: traceCallsite.filePath ?? fileId,
        line: traceCallsite.line,
        column: traceCallsite.column,
      }
      : undefined,
  });
}

function addStyleDataItems(
  value: unknown,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  type: ExtractedCssBuilderType,
  slotId: string | null,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  cssConfig: CssConfig,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  const values = Array.isArray(value) ? value : [value];

  let i = 0;
  while (i < values.length) {
    const styleData = values[i];
    if (!isStyleData(styleData)) return false;

    const sourceItems = styleData[BUILDER_STATE].items;

    let j = 0;
    while (j < sourceItems.length) {
      const sourceItem = sourceItems[j];
      if (Array.isArray(sourceItem)) {
        addExtractedStyleItem(sourceItem, type, slotId, items);
        j++;
        continue;
      }

      if (isStyleTokenOverrideData(sourceItem) || sourceItem.type !== BUILDER_TYPE_STYLE) {
        return false;
      }

      addRuntimeStyleItem(
        sourceItem,
        selector,
        parentSelector,
        atRules,
        fileId,
        type,
        slotId,
        items,
        cssRules,
        cssConfig,
        callsiteOverride,
      );

      j++;
    }

    i++;
  }

  return true;
}

function addStyleDataSpreadItems(
  value: unknown,
  expression: BabelTypes.Expression,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  type: ExtractedCssBuilderType,
  slotId: string | null,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  cssConfig: CssConfig,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  const start = items.length;

  if (
    !addStyleDataItems(
      value,
      selector,
      parentSelector,
      atRules,
      fileId,
      type,
      slotId,
      items,
      cssRules,
      cssConfig,
      callsiteOverride,
    )
  ) {
    return false;
  }

  const fallbackItems = items
    .splice(start)
    .filter(Array.isArray) as CompiledCssItem[];

  const spreadItem: CompiledStyleSpreadItem = {
    kind: 'style-spread',
    expression,
    items: fallbackItems,
  };

  items.push(spreadItem);

  return true;
}

function addExtractedStyleItem(
  sourceItem: unknown[],
  type: ExtractedCssBuilderType,
  slotId: string | null,
  items: CompiledItem[],
) {
  const startsWithType = sourceItem[0] === BUILDER_TYPE_STYLE;
  const dedupe = String(startsWithType ? sourceItem[1] : sourceItem[0]);
  const className = String(startsWithType ? sourceItem[2] : sourceItem[1]);
  const value = startsWithType ? sourceItem[3] : sourceItem[2];

  const item = createCompiledItem(type, slotId, dedupe, className, false);

  if (value !== undefined && type !== BUILDER_TYPE_SCOPE) {
    setCompiledItemValue(item, value as ExtractedItemValue);

    if (Array.isArray(value) && value[0] === ITEM_VALUE_TYPE_VARIABLE) {
      const runtimeValue = getCompiledRuntimeValue(value[2]);
      if (runtimeValue) item.valueNode = runtimeValue;
    }
  }

  items.push(item);
}

function addRuntimeStyleItem(
  sourceItem: RuntimeStyleItem,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  type: ExtractedCssBuilderType,
  slotId: string | null,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  cssConfig: CssConfig,
  callsiteOverride: TraceCallsiteOverride = null,
) {
  let priority: number | null = null;
  let value = sourceItem.value;

  if (Array.isArray(value)) {
    priority = value[1];
    value = value[0];
  }

  const itemSelector = selector ?? sourceItem.selector;
  const itemAtRules = mergeAtRules(atRules, sourceItem.atRule);
  const variable = sourceItem.variable;
  const runtimeValue = variable?.[0] === ITEM_VALUE_TYPE_VARIABLE
    ? getCompiledRuntimeValue(variable[2])
    : undefined;
  const shouldUseVariable = !!variable &&
    (
      variable[0] !== ITEM_VALUE_TYPE_VARIABLE ||
      !!sourceItem.token ||
      !!runtimeValue
    );
  const valueStr = variable?.[0] === ITEM_VALUE_TYPE_VARIABLE && !shouldUseVariable
    ? String(variable[2] ?? '')
    : String(value ?? '');

  const dedupe = getClassNameDedupe(
    sourceItem.property,
    priority,
    itemSelector,
    parentSelector,
    itemAtRules,
  );

  const traceCallsite = callsiteOverride ?? sourceItem.callsite;

  const className = getAtomicClassName(
    sourceItem.property,
    priority,
    valueStr,
    itemSelector,
    parentSelector,
    itemAtRules,
    traceCallsite,
    cssConfig.localClassName,
    cssConfig.debugClassName,
    cssConfig.classNameFormat,
    sourceItem.transformClassName ?? null,
    cssConfig.transformClassNameFormat,
    cssConfig.hashLength,
  );

  const item: CompiledItem = createCompiledItem(
    type,
    slotId,
    dedupe,
    className,
    !!parentSelector,
  );
  item.sourceTrace = getRuntimeStyleItemSourceTrace(sourceItem, fileId);

  if (type !== BUILDER_TYPE_SCOPE && variable && shouldUseVariable) {
    setCompiledItemValue(item, variable);
    if (runtimeValue) item.valueNode = runtimeValue;
  }

  items.push(item);

  const css = buildAtomicRule(
    className,
    sourceItem.property,
    valueStr,
    itemSelector,
    parentSelector,
    itemAtRules,
    cssConfig.scopeTargetPrefix,
  );

  const layerPriority = getAtomicRuleLayerPriority(
    sourceItem.property,
    priority,
    itemSelector,
    parentSelector,
    itemAtRules,
    type === BUILDER_TYPE_SCOPE,
  );

  cssRules.push({
    dedupe,
    className,
    css,
    priority: layerPriority,
    trace: traceCallsite
      ? {
        filePath: traceCallsite.filePath ?? fileId,
        line: traceCallsite.line,
        column: traceCallsite.column,
      }
      : undefined,
  });
}

function getRuntimeStyleItemSourceTrace(
  item: RuntimeStyleItem,
  fileId: string,
): CompiledCssItem['sourceTrace'] {
  const trace = getRuntimeStyleItemValueTrace(item);
  if (!trace) return undefined;

  return {
    property: item.property,
    filePath: trace.filePath || fileId,
    line: trace.line,
    column: trace.column,
    trace: trace.trace,
  };
}

function getRuntimeStyleItemValueTrace(
  item: RuntimeStyleItem,
): CssExtractRule['trace'] {
  if (item.debug && item.debugField) {
    const loc = item.debug.fields?.[item.debugField];
    if (Array.isArray(loc)) return createRuntimeStyleItemTrace(loc, item.debug.sourceUrl);
    if (loc) {
      const valueLoc = loc[1] ?? loc[0] ?? null;
      return valueLoc ? createRuntimeStyleItemTrace(valueLoc, item.debug.sourceUrl) : undefined;
    }
  }

  return item.callsite
    ? {
      filePath: item.callsite.filePath ?? '',
      line: item.callsite.line,
      column: item.callsite.column,
    }
    : undefined;
}

function createRuntimeStyleItemTrace(
  loc: DebugLoc,
  fallbackFilePath: string,
): CssExtractRule['trace'] {
  return {
    filePath: loc[3] ?? fallbackFilePath,
    line: loc[0],
    column: loc[1],
  };
}

function getAtRulePriority(
  selectorPriority: number | null,
  isMedia: boolean,
  firstArg: BabelTypes.Node | undefined,
): number | null {
  return isMedia && isNumericLiteral(firstArg) ? firstArg.value : selectorPriority;
}

// ─── core item generation ─────────────────────────────────────────────────────

function addStyleItems(
  styleObj: CompiledStyleObject,
  selector: ItemSelector | null,
  parentSelector: ItemSelector | null,
  atRules: ItemSelector[] | null,
  fileId: string,
  type: ExtractedCssBuilderType,
  slotId: string | null,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  cssConfig: CssConfig,
  callsiteOverride: TraceCallsiteOverride = null,
): boolean {
  if (!styleObj || typeof styleObj !== 'object') return false;

  const keys = Object.keys(styleObj);
  const propertyLocations = styleObj[COMPILED_STYLE_OBJECT_LOCATIONS];
  let i = 0;

  while (i < keys.length) {
    const property = keys[i];
    const rawValue = styleObj[property];

    let priority: number | null = null;
    let value: unknown = rawValue;
    let transformClassName: string | null = null;

    if (Array.isArray(rawValue) && rawValue.length === 2 && typeof rawValue[0] === 'number') {
      priority = rawValue[0];
      value = rawValue[1];
    }

    if (isClassNameValue(value)) {
      transformClassName = value.className;
      value = value.value;
    }

    if (value === null || value === undefined) {
      i++;
      continue;
    }

    const ref = isAtRuleRef(value) ? value : null;
    if (ref) value = ref.value;

    const token = isStyleTokenData(value) ? value : null;

    const runtimeValue = getCompiledRuntimeValue(value);

    const propertyLoc = propertyLocations?.[property];

    const propertyCallsite = callsiteOverride ?? (propertyLoc
      ? {
        stack: '',
        filePath: propertyLoc.filePath ?? fileId,
        line: propertyLoc.line,
        column: propertyLoc.column,
      }
      : null);

    const shouldUseVariable = !!(token || runtimeValue);

    const variableName = shouldUseVariable && propertyLoc
      ? getLocalVarName(
        propertyLoc.filePath ?? fileId,
        propertyLoc.line,
        propertyLoc.column,
        cssConfig.tokenNameFormat,
      )
      : null;

    const valueStr = variableName
      ? token
        ? getCssVarRawFallback(variableName, getTokenVar(token, cssConfig.tokenNameFormat))
        : `var(${variableName})`
      : token
      ? getTokenVar(token, cssConfig.tokenNameFormat)
      : String(value);

    const dedupe = getClassNameDedupe(
      property,
      priority,
      selector,
      parentSelector,
      atRules,
    );

    const className = getAtomicClassName(
      property,
      priority,
      valueStr,
      selector,
      parentSelector,
      atRules,
      propertyCallsite,
      cssConfig.localClassName,
      cssConfig.debugClassName,
      cssConfig.classNameFormat,
      transformClassName,
      cssConfig.transformClassNameFormat,
      cssConfig.hashLength,
    );

    const item: CompiledItem = createCompiledItem(
      type,
      slotId,
      dedupe,
      className,
      !!parentSelector,
    );
    item.sourceTrace = propertyCallsite
      ? {
        property,
        filePath: propertyCallsite.filePath ?? fileId,
        line: propertyCallsite.line,
        column: propertyCallsite.column,
        trace: callsiteOverride ? undefined : propertyLoc?.trace,
      }
      : undefined;

    if (ref && type !== BUILDER_TYPE_SCOPE) {
      setCompiledItemValue(item, [
        ITEM_VALUE_TYPE_AT_RULE_REF,
        {
          key: ref.key,
          value: ref.value,
          css: null,
          tokens: ref.tokens,
        },
      ]);
    } else if (shouldUseVariable) {
      setCompiledItemValue(item, [
        ITEM_VALUE_TYPE_VARIABLE,
        variableName ?? (token ? getTokenVarName(token, cssConfig.tokenNameFormat) : ''),
        token ?? value,
        shouldAppendCssPx(property) ? ITEM_VALUE_NUMBER_PX : undefined,
      ]);

      item.valueNode = runtimeValue ?? (token as CompiledRuntimeValue)[COMPILED_RUNTIME_VALUE];
    }

    items.push(item);

    const css = buildAtomicRule(
      className,
      property,
      valueStr,
      selector,
      parentSelector,
      atRules,
      cssConfig.scopeTargetPrefix,
    );

    const layerPriority = getAtomicRuleLayerPriority(
      property,
      priority,
      selector,
      parentSelector,
      atRules,
      type === BUILDER_TYPE_SCOPE,
    );

    cssRules.push({
      dedupe: dedupe,
      className,
      css,
      priority: layerPriority,
      trace: propertyCallsite
        ? {
          filePath: propertyCallsite.filePath ?? fileId,
          line: propertyCallsite.line,
          column: propertyCallsite.column,
          trace: callsiteOverride ? undefined : propertyLoc?.trace,
        }
        : undefined,
    });

    if (ref?.css) {
      cssRules.push({
        dedupe: ref.key,
        className: ref.value,
        css: ref.css,
        priority: LayerDefaultPriority,
        trace: propertyCallsite
          ? {
            filePath: propertyCallsite.filePath ?? fileId,
            line: propertyCallsite.line,
            column: propertyCallsite.column,
          }
          : undefined,
      });
    }

    i++;
  }

  return true;
}

function throwIfRequiredStaticStyleValue(result: EvalResult) {
  if (result.ok) return;
  if (
    result.reason.includes('createCounterStyle') ||
    result.reason.includes('createFontFace') ||
    result.reason.includes('createFontPaletteValues') ||
    result.reason.includes('createPositionTry') ||
    result.reason.includes('createProperty') ||
    result.reason.includes('fontSrc')
  ) {
    throw new Error(result.reason);
  }
}

function throwIfRequiredStaticSelectorValue(
  options: CompilerOptions,
  fnLabel: string,
  result: EvalResult,
) {
  if (result.ok || options.dev?.checkSelector === false) return;

  throw new Error([
    'Invalid selector',
    '',
    `${fnLabel}(...)`,
    `Selector argument must be statically analyzable: ${result.reason}`,
  ].join('\n'));
}

function createCompiledItem(
  type: ExtractedCssBuilderType,
  slotId: string | null,
  dedupe: string,
  className: string,
  hasParentSelector: boolean,
): CompiledCssItem {
  if (type === BUILDER_TYPE_STYLE) {
    return [type, dedupe, className];
  }

  if (type === BUILDER_TYPE_SLOT) {
    return [type, slotId ?? '', dedupe, className];
  }

  if (type === BUILDER_TYPE_SCOPE) {
    const item: CompiledCssItem = [type, slotId ?? '', dedupe, className];
    if (hasParentSelector) item.hasParentSelector = true;
    return item;
  }

  return [BUILDER_TYPE_SLOT_OVERRIDE, slotId ?? '', dedupe, className];
}

function setCompiledItemValue(
  item: CompiledCssItem,
  value: ExtractedItemValue,
) {
  if (item[0] === BUILDER_TYPE_STYLE) {
    item[3] = value;
    return;
  }

  if (item[0] === BUILDER_TYPE_SLOT || item[0] === BUILDER_TYPE_SLOT_OVERRIDE) {
    item[4] = value;
  }

  if (item[0] === BUILDER_TYPE_SCOPE) {
    item[4] = value;
  }
}

function getCompiledRuntimeValue(value: unknown): BabelTypes.Expression | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return (value as CompiledRuntimeValue)[COMPILED_RUNTIME_VALUE];
}
