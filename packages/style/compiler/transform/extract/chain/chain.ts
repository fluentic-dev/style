import type * as BabelTypes from '@babel/types';
import { getAtomicClassName, getClassNameDedupe } from '../../../../atomic/classname';
import { buildAtomicRule, getAtomicRuleLayerPriority } from '../../../../atomic/rule';
import { getLocalVarName } from '../../../../atomic/token';
import { getTokenVar, getTokenVarName } from '../../../../atomic/token';
import { getCssVar } from '../../../../atomic/utils/css';
import {
  normalizeSelectorArg,
  SELECTOR_ARG,
  SELECTOR_ARGS,
  SELECTOR_AT_RULE,
  SELECTOR_CONTAINER,
  SELECTOR_MEDIA,
} from '../../../../builder/data';
import {
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  ITEM_VALUE_TYPE_VARIABLE,
} from '../../../../builder/data/const';
import type { ExtractedItemValue, ItemSelector } from '../../../../builder/data/state';
import { PrioritySelectors } from '../../../../selector/presets';
import type { Selector } from '../../../../selector/types';
import { getStyleFnMeta } from '../../../../style/style';
import { isStyleTokenData, isStyleTokenOverrideData } from '../../../../style/token';
import type { StyleTransform } from '../../../../style/transform';
import { hashString } from '../../../../utils/hash';
import type { CompilerOptions } from '../../../compiler/types';
import { DEFAULT_CONFIG } from '../../../utils/constants';
import {
  COMPILED_RUNTIME_VALUE,
  COMPILED_STYLE_OBJECT_LOCATIONS,
  type CompiledRuntimeValue,
  type CompiledStyleObject,
  type EvalResult,
  type EvalScope,
  evaluateNode,
} from '../../evaluator';
import { extractStyleChain, type StyleChainParseResult } from './extract_chain';
import type { CompiledChainData, CompiledItem, CompiledCssItem, CssExtractRule } from './types';

type SelectorsMap = Record<string, Selector>;

type CssConfig = {
  classNamePrefix: string;
  localClassName: boolean;
  debugClassName: boolean;
  debugPropertyLength: number;
  debugValueLength: number;
  debugSelectorLength: number;
  debugParentSelectorLength: number;
  debugAtRuleLength: number;
  scopeTargetPrefix: string;
  tokenVarPrefix: string;
};

type StyleChainBuilderType =
  | typeof BUILDER_TYPE_STYLE
  | typeof BUILDER_TYPE_SLOT
  | typeof BUILDER_TYPE_SLOT_OVERRIDE;

type ExtractedCssBuilderType =
  | StyleChainBuilderType
  | typeof BUILDER_TYPE_SCOPE;

function applyTransform(
  styleObj: Record<string, unknown>,
  transform: StyleTransform | null,
): Record<string, unknown> {
  return transform ? transform.transform(styleObj) : styleObj;
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
  styleNames: Set<string> = new Set(),
): CompiledChainData | null {
  const css = getCssConfig(opts);
  const meta = opts.styleFn ? getStyleFnMeta(opts.styleFn) : null;
  const selectors = meta?.selectors ?? PrioritySelectors;
  const transform = meta?.transform ?? null;

  if (chain.kind === 'style') {
    return compileStyleChain(chain, selectors, fileId, scope, css, transform, styleNames);
  }

  if (chain.kind === 'slot') {
    const slotId = computeSlotId(fileId, nodeLoc);
    return compileSlotChain(chain, slotId, selectors, fileId, scope, css, transform, styleNames);
  }

  if (chain.kind === 'scope') {
    return compileScopeChain(chain, selectors, fileId, scope, css, transform);
  }

  return null;
}

function getCssConfig(
  opts: CompilerOptions,
): CssConfig {
  return {
    classNamePrefix: opts.css?.classNamePrefix ?? DEFAULT_CONFIG.classNamePrefix,
    localClassName: opts.css?.localClassName ?? DEFAULT_CONFIG.localClassName,
    debugClassName: opts.css?.debugClassName ?? DEFAULT_CONFIG.debugClassName,
    debugPropertyLength: opts.css?.debugPropertyLength ?? DEFAULT_CONFIG.debugPropertyLength,
    debugValueLength: opts.css?.debugValueLength ?? DEFAULT_CONFIG.debugValueLength,
    debugSelectorLength: opts.css?.debugSelectorLength ?? DEFAULT_CONFIG.debugSelectorLength,
    debugParentSelectorLength: opts.css?.debugParentSelectorLength ?? DEFAULT_CONFIG.debugParentSelectorLength,
    debugAtRuleLength: opts.css?.debugAtRuleLength ?? DEFAULT_CONFIG.debugAtRuleLength,
    scopeTargetPrefix: opts.css?.scopeTargetPrefix ?? DEFAULT_CONFIG.scopeTargetPrefix,
    tokenVarPrefix: opts.css?.tokenVarPrefix ?? DEFAULT_CONFIG.tokenVarPrefix,
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
    )
  ) {
    return null;
  }

  return { type: 'style', items, rules };
}

function compileStyleChainInto(
  chain: NonNullable<StyleChainParseResult>,
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  transform: StyleTransform | null,
  type: StyleChainBuilderType,
  slotId: string | null,
  atRules: ItemSelector[] | null,
  items: CompiledItem[],
  rules: CssExtractRule[],
  styleNames: Set<string>,
): boolean {
  if (chain.baseArgs.length > 0) {
    const styleArg = evaluateNode(chain.baseArgs[0], scope);
    if (!styleArg.ok) return false;
    const styleObj = applyTransform(styleArg.value as Record<string, unknown>, transform);
    if (!addStyleItems(styleObj, null, null, atRules, fileId, type, slotId, items, rules, cssConfig)) {
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
): CompiledChainData | null {
  const items: CompiledItem[] = [];
  const rules: CssExtractRule[] = [];

  // Base slot style
  if (chain.baseArgs.length > 0) {
    const styleArg = evaluateNode(chain.baseArgs[0], scope);
    if (!styleArg.ok) return null;
    const styleObj = applyTransform(styleArg.value as Record<string, unknown>, transform);
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
      )
    ) {
      return null;
    }
  }

  // Scope methods (media, container, etc.)
  let i = 0;
  while (i < chain.methods.length) {
    const method = chain.methods[i];
    const result = compileScopeMethod(method, selectors, fileId, scope, cssConfig, items, rules, transform);
    if (!result) return null;
    i++;
  }

  return { type: 'scope', items, rules };
}

function compileScopeMethod(
  method: { name: string; args: BabelTypes.Node[]; },
  selectors: SelectorsMap,
  fileId: string,
  scope: EvalScope,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
): boolean {
  const selector = selectors[method.name];
  if (!selector) return false;

  const selectorStr = selector.selector.trim();

  if (selectorStr.startsWith(SELECTOR_AT_RULE)) {
    // At-rule scope method: media('(max-width: 900px)', [...items])
    const isMedia = selectorStr.startsWith(SELECTOR_MEDIA) || selectorStr.startsWith(SELECTOR_CONTAINER);

    const priority = getAtRulePriority(selector.priority, isMedia, method.args[0]);
    let argOffset = 0;
    if (isMedia && isNumericLiteral(method.args[0])) {
      argOffset = 1; // skip priority arg
    }

    const queryArg = evaluateNode(method.args[argOffset], scope);
    if (!queryArg.ok) return false;

    const [before, after] = selectorStr.split(SELECTOR_ARGS);
    const atRule = before + String(queryArg.value) + (after ?? '');
    const atRuleSelector: ItemSelector = priority !== null
      ? [atRule, priority]
      : atRule;

    const itemsArg = method.args[argOffset + 1];
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
    );
  }

  if (selectorStr.includes(SELECTOR_ARGS) || selectorStr.includes(SELECTOR_ARG)) {
    const hasArgsTemplate = selectorStr.includes(SELECTOR_ARGS);
    const splitToken = hasArgsTemplate ? SELECTOR_ARGS : SELECTOR_ARG;
    const [before, after] = selectorStr.split(splitToken);

    const selectorArg = evaluateNode(method.args[0], scope);
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
): boolean {
  const tokenOverride = evaluateNode(node, scope);

  if (tokenOverride.ok && isStyleTokenOverrideData(tokenOverride.value)) {
    items.push({
      kind: 'token',
      valueNode: getCompiledRuntimeValue(tokenOverride.value) ?? node as BabelTypes.Expression,
    });
    return true;
  }

  // Must be a call expression: slotRef({ ... }) or slotRef().method(...)
  if (node.type !== 'CallExpression') return false;

  // Extract the call chain to find the slot reference
  const overrideChain = extractOverrideChain(node, selectors, scope, fileId, transform);
  if (!overrideChain) return false;

  const { slotId, items: overrideItems } = overrideChain;

  // Add the scope items
  let i = 0;
  while (i < overrideItems.length) {
    const overrideItem = overrideItems[i];
    const mergedAtRules = mergeAtRules(atRules, overrideItem.atRules);

    if (
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
      )
    ) {
      return false;
    }

    i++;
  }

  return true;
}

type OverrideItem = {
  styleObj: Record<string, unknown>;
  selector: ItemSelector | null;
  atRules: ItemSelector[] | null;
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
  transform: StyleTransform | null,
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
      const inner = extractOverrideChain(obj, selectors, scope, fileId, transform);
      if (!inner) return null;

      const overrideItem = resolveOverrideMethod(
        methodName,
        node.arguments as BabelTypes.Node[],
        selectors,
        scope,
        transform,
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
      styleObj: applyTransform((styleArg.value as Record<string, unknown>) ?? {}, transform),
      selector: null,
      atRules: null,
    });
  }

  return { slotId, items };
}

function resolveOverrideMethod(
  methodName: string,
  args: BabelTypes.Node[],
  selectors: SelectorsMap,
  scope: EvalScope,
  transform: StyleTransform | null,
): OverrideItem | null {
  const sel = selectors[methodName];
  if (!sel) return null;

  const selectorStr = sel.selector.trim();

  if (selectorStr.startsWith(SELECTOR_AT_RULE)) {
    const isMedia = selectorStr.startsWith(SELECTOR_MEDIA) || selectorStr.startsWith(SELECTOR_CONTAINER);

    const priority = getAtRulePriority(sel.priority, isMedia, args[0]);
    let argOffset = 0;
    if (isMedia && isNumericLiteral(args[0])) {
      argOffset = 1;
    }

    const queryArg = evaluateNode(args[argOffset], scope);
    if (!queryArg.ok) return null;

    const styleArg = evaluateNode(args[argOffset + 1], scope);
    if (!styleArg.ok) return null;

    const [before, after] = selectorStr.split(SELECTOR_ARGS);
    const atRule = before + String(queryArg.value) + (after ?? '');
    const atRuleSelector: ItemSelector = priority !== null ? [atRule, priority] : atRule;

    return {
      styleObj: applyTransform(styleArg.value as Record<string, unknown>, transform),
      selector: null,
      atRules: [atRuleSelector],
    };
  }

  if (selectorStr.includes(SELECTOR_ARGS) || selectorStr.includes(SELECTOR_ARG)) {
    const hasArgsTemplate = selectorStr.includes(SELECTOR_ARGS);
    const splitToken = hasArgsTemplate ? SELECTOR_ARGS : SELECTOR_ARG;
    const [before, after] = selectorStr.split(splitToken);

    const selectorArg = evaluateNode(args[0], scope);
    if (!selectorArg.ok) return null;

    const styleArg = evaluateNode(args[1], scope);
    if (!styleArg.ok) return null;

    const selectorText = before + normalizeSelectorArg(String(selectorArg.value ?? '')) + (after ?? '');
    const itemSelector: ItemSelector = sel.priority !== null ? [selectorText, sel.priority] : selectorText;

    return {
      styleObj: applyTransform(styleArg.value as Record<string, unknown>, transform),
      selector: itemSelector,
      atRules: null,
    };
  }

  const styleArg = evaluateNode(args[0], scope);
  if (!styleArg.ok) return null;

  return {
    styleObj: applyTransform(styleArg.value as Record<string, unknown>, transform),
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
  method: { name: string; args: BabelTypes.Node[]; },
  selectors: SelectorsMap,
  slotId: string | null,
  fileId: string,
  scope: EvalScope,
  type: StyleChainBuilderType,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  atRules: ItemSelector[] | null,
  styleNames: Set<string>,
): boolean {
  const selector = selectors[method.name];
  if (!selector) return false;

  const selectorStr = selector.selector.trim();

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
    );
  }

  const itemSelector: ItemSelector = selector.priority !== null
    ? [selectorStr, selector.priority]
    : selectorStr;

  const styleArg = evaluateNode(method.args[0], scope);
  if (!styleArg.ok) return false;
  const styleObj = applyTransform(styleArg.value as Record<string, unknown>, transform);

  return addStyleItems(styleObj, itemSelector, null, atRules, fileId, type, slotId, items, cssRules, cssConfig);
}

function compileAtRuleMethod(
  method: { name: string; args: BabelTypes.Node[]; },
  slotId: string | null,
  selector: Selector,
  selectorStr: string,
  fileId: string,
  scope: EvalScope,
  type: StyleChainBuilderType,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  atRules: ItemSelector[] | null,
  selectors: SelectorsMap,
  styleNames: Set<string>,
): boolean {
  const isMedia = selectorStr.startsWith(SELECTOR_MEDIA) || selectorStr.startsWith(SELECTOR_CONTAINER);

  const priority = getAtRulePriority(selector.priority, isMedia, method.args[0]);
  let argOffset = 0;
  if (isMedia && isNumericLiteral(method.args[0])) {
    argOffset = 1;
  }

  const queryArg = evaluateNode(method.args[argOffset], scope);
  if (!queryArg.ok) return false;

  const [before, after] = selectorStr.split(SELECTOR_ARGS);
  const atRule = before + String(queryArg.value) + (after ?? '');

  const atRuleSelector: ItemSelector = priority !== null ? [atRule, priority] : atRule;
  const nextAtRules = mergeAtRules(atRules, [atRuleSelector]);

  const styleArg = method.args[argOffset + 1];
  if (!styleArg) return false;

  // Style arg can be a StyleData reference (style({...})) or plain object
  if (styleArg.type === 'CallExpression') {
    // Nested style() call
    const nestedChain = extractStyleChain(styleArg, styleNames);
    if (nestedChain?.kind === 'style') {
      return compileStyleChainInto(
        nestedChain,
        selectors,
        fileId,
        scope,
        cssConfig,
        transform,
        type,
        slotId,
        nextAtRules,
        items,
        cssRules,
        styleNames,
      );
    }
    // Could not parse as chain — try to evaluate as static object
    const evaled = evaluateNode(styleArg, scope);
    if (!evaled.ok) return false;
    return addStyleItems(
      applyTransform(evaled.value as Record<string, unknown>, transform),
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
  if (!styleResult.ok) return false;

  return addStyleItems(
    applyTransform(styleResult.value as Record<string, unknown>, transform),
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
  method: { name: string; args: BabelTypes.Node[]; },
  selector: Selector,
  slotId: string | null,
  fileId: string,
  scope: EvalScope,
  type: StyleChainBuilderType,
  cssConfig: CssConfig,
  items: CompiledItem[],
  cssRules: CssExtractRule[],
  transform: StyleTransform | null,
  atRules: ItemSelector[] | null,
): boolean {
  const selectorStr = selector.selector.trim();
  const hasArgsTemplate = selectorStr.includes(SELECTOR_ARGS);
  const splitToken = hasArgsTemplate ? SELECTOR_ARGS : SELECTOR_ARG;
  const [before, after] = selectorStr.split(splitToken);
  const argIndex = 0;
  const styleIndex = 1;

  const argNode = method.args[argIndex];
  const styleArg = method.args[styleIndex];
  if (!argNode || !styleArg) return false;

  const selectorArg = evaluateNode(argNode, scope);
  if (!selectorArg.ok) return false;

  const styleResult = evaluateNode(styleArg, scope);
  if (!styleResult.ok) return false;

  const selectorValues = Array.isArray(selectorArg.value)
    ? selectorArg.value
    : [selectorArg.value];

  const styleObj = applyTransform(styleResult.value as Record<string, unknown>, transform);

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

    if (Array.isArray(rawValue) && rawValue.length === 2 && typeof rawValue[0] === 'number') {
      priority = rawValue[0];
      value = rawValue[1];
    }

    if (value === null || value === undefined) {
      i++;
      continue;
    }

    const token = isStyleTokenData(value) ? value : null;

    const runtimeValue = getCompiledRuntimeValue(value);

    const propertyLoc = propertyLocations?.[property];

    const propertyCallsite = propertyLoc
      ? {
        stack: '',
        filePath: propertyLoc.filePath ?? fileId,
        line: propertyLoc.line,
        column: propertyLoc.column,
      }
      : null;

    const variableName = (token || runtimeValue) && propertyLoc
      ? getLocalVarName(
        propertyLoc.filePath ?? fileId,
        propertyLoc.line,
        propertyLoc.column,
        cssConfig.tokenVarPrefix,
      )
      : null;

    const valueStr = variableName
      ? token
        ? getCssVar(variableName, String(token.value ?? ''))
        : `var(${variableName})`
      : token
      ? getTokenVar(token, cssConfig.tokenVarPrefix)
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
      cssConfig.classNamePrefix,
      cssConfig.localClassName,
      cssConfig.debugClassName,
      cssConfig.debugPropertyLength,
      cssConfig.debugValueLength,
      cssConfig.debugSelectorLength,
      cssConfig.debugParentSelectorLength,
      cssConfig.debugAtRuleLength,
    );

    const item: CompiledItem = createCompiledItem(
      type,
      slotId,
      dedupe,
      className,
      !!parentSelector,
    );

    if (type !== BUILDER_TYPE_SCOPE && (token || runtimeValue)) {
      setCompiledItemValue(item, [
        ITEM_VALUE_TYPE_VARIABLE,
        variableName ?? (token ? getTokenVarName(token, cssConfig.tokenVarPrefix) : ''),
        token ?? value,
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
    });

    i++;
  }

  return true;
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
}

function getCompiledRuntimeValue(value: unknown): BabelTypes.Expression | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return (value as CompiledRuntimeValue)[COMPILED_RUNTIME_VALUE];
}
