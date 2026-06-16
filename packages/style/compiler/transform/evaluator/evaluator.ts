import type * as BabelTypes from '@babel/types';
import { buildCounterStyleCss } from '../../../atomic/atRule/counterStyle';
import { buildFontFaceCss, type FontFaceObject } from '../../../atomic/atRule/fontFace';
import { buildFontPaletteValuesCss } from '../../../atomic/atRule/fontPaletteValues';
import { fontSrc } from '../../../atomic/atRule/fontSrc';
import { buildKeyframesCss, type KeyframesObject } from '../../../atomic/atRule/keyframes';
import { buildPositionTryCss } from '../../../atomic/atRule/positionTry';
import { buildPropertyCss, type PropertyObject } from '../../../atomic/atRule/property';
import { buildScrollTimelineCss } from '../../../atomic/atRule/scrollTimeline';
import { type AtRuleCssOptions, createAtRuleName } from '../../../atomic/atRule/utils';
import { buildViewTimelineCss } from '../../../atomic/atRule/viewTimeline';
import { TRACE_STYLE, TRACE_VALUE } from '../../../builder/data/debug';
import { createExtractedScope, createExtractedSlot, createExtractedStyle } from '../../../builder/extract';
import { RUNTIME_CONFIG } from '../../../config';
import { transformKeyframes } from '../../../style/keyframes';
import {
  getStyleTokenId,
  isStyleTokenData,
  type StyleTokenData,
  type StyleTokenOverride,
  TOKEN_ID,
  TOKEN_OVERRIDE,
} from '../../../style/token';
import type { StyleTransform } from '../../../style/transform';
import {
  AT_RULE_REF_TYPE_COUNTER_STYLE,
  AT_RULE_REF_TYPE_FONT_FACE,
  AT_RULE_REF_TYPE_FONT_PALETTE_VALUES,
  AT_RULE_REF_TYPE_KEYFRAMES,
  AT_RULE_REF_TYPE_POSITION_TRY,
  AT_RULE_REF_TYPE_PROPERTY,
  AT_RULE_REF_TYPE_SCROLL_TIMELINE,
  AT_RULE_REF_TYPE_VIEW_TIMELINE,
  type AtRuleRef,
  type AtRuleRefType,
  createAtRuleRef,
} from '../../../style/valueRef';
import { hashString } from '../../../utils/hash';
import {
  FN_CREATE_COUNTER_STYLE,
  FN_CREATE_EXTRACTED_SCOPE,
  FN_CREATE_EXTRACTED_SLOT,
  FN_CREATE_EXTRACTED_STYLE,
  FN_CREATE_FONT_FACE,
  FN_CREATE_FONT_PALETTE_VALUES,
  FN_CREATE_KEYFRAMES,
  FN_CREATE_POSITION_TRY,
  FN_CREATE_PROPERTY,
  FN_CREATE_SCROLL_TIMELINE,
  FN_CREATE_TOKEN,
  FN_CREATE_TOKENS,
  FN_CREATE_VALUES,
  FN_CREATE_VIEW_TIMELINE,
  FN_FONT_SRC,
  FN_STYLE_KEYFRAMES,
  FN_STYLE_PLAIN,
  FN_STYLE_RAW,
  FN_STYLE_VALUE,
  IMPORT_EXTRACT,
  IMPORT_PATHS,
} from '../../utils/constants';
import type { EvalFail, EvalModuleBindings, EvalOk, EvalResult, ImportMap, ResolveImportFn } from './types';

const STYLE_IMPORT_PATHS = new Set(IMPORT_PATHS);

export const COMPILED_RUNTIME_VALUE = Symbol();
export const COMPILED_STYLE_OBJECT_LOCATIONS = Symbol();
const COMPILED_TOKEN_FACTORY = Symbol();

export type CompiledRuntimeValue = {
  [COMPILED_RUNTIME_VALUE]?: BabelTypes.Expression;
};

export type CompiledStyleObjectLocations = Record<string, {
  filePath: string;
  line: number;
  column: number;
  trace?: typeof TRACE_STYLE | typeof TRACE_VALUE;
}>;

export type CompiledStyleObject = Record<string, unknown> & {
  [COMPILED_STYLE_OBJECT_LOCATIONS]?: CompiledStyleObjectLocations;
};

type CompiledTokenFactory = {
  [COMPILED_TOKEN_FACTORY]: true;
  tokens: Map<unknown, StyleTokenData>;
};

export function evalOk(value: unknown): EvalOk {
  return { ok: true, value };
}

export function evalFail(reason: string): EvalFail {
  return { ok: false, reason };
}

export type EvalScope = {
  bindings: EvalModuleBindings;
  imports: ImportMap;
  resolveImport: ResolveImportFn;
  filePath: string;
  styleFilePath?: string;
  styleNames?: Set<string>;
  styleTransform?: StyleTransform | null;
  sourcemapTrace?: 'style' | 'value';
};

export function evaluateNode(
  node: BabelTypes.Node | null | undefined,
  scope: EvalScope,
): EvalResult {
  if (!node) return evalFail('null node');

  switch (node.type) {
    case 'StringLiteral':
      return evalOk(node.value);

    case 'NumericLiteral':
      return evalOk(node.value);

    case 'BooleanLiteral':
      return evalOk(node.value);

    case 'NullLiteral':
      return evalOk(null);

    case 'TemplateLiteral':
      return evaluateTemplate(node, scope);

    case 'Identifier':
      return evaluateIdentifier(node, scope);

    case 'MemberExpression':
      return evaluateMember(node as BabelTypes.MemberExpression, scope);

    case 'ObjectExpression':
      return evaluateObject(node as BabelTypes.ObjectExpression, scope);

    case 'ArrayExpression':
      return evaluateArray(node as BabelTypes.ArrayExpression, scope);

    case 'CallExpression':
      return evaluateCall(node as BabelTypes.CallExpression, scope);

    case 'BinaryExpression':
      return evaluateBinary(node as BabelTypes.BinaryExpression, scope);

    case 'UnaryExpression':
      return evaluateUnary(node as BabelTypes.UnaryExpression, scope);

    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
      return evaluateNode((node as any).expression, scope);

    default:
      return evalFail(`Cannot statically evaluate: ${node.type}`);
  }
}

function evaluateTemplate(node: BabelTypes.TemplateLiteral, scope: EvalScope): EvalResult {
  let result = '';
  const quasis = node.quasis;
  const exprs = node.expressions;

  let i = 0;
  while (i < quasis.length) {
    result += quasis[i].value.cooked ?? quasis[i].value.raw;
    if (i < exprs.length) {
      const v = evaluateNode(exprs[i] as BabelTypes.Node, scope);
      if (!v.ok) return v;
      result += String(v.value ?? '');
    }
    i++;
  }
  return evalOk(result);
}

function evaluateIdentifier(node: BabelTypes.Identifier, scope: EvalScope): EvalResult {
  const name = node.name;

  if (name === 'undefined') return evalOk(undefined);
  if (name === 'null') return evalOk(null);
  if (name === 'true') return evalOk(true);
  if (name === 'false') return evalOk(false);

  // Check local bindings first
  if (scope.bindings.has(name)) {
    const result = scope.bindings.get(name)!;

    if (result.ok && isStyleTokenData(result.value)) {
      return evalOk(withRuntimeValue(node, result.value));
    }

    return result;
  }

  // Check imports
  const imp = scope.imports.get(name);

  if (imp) {
    const exported = scope.resolveImport(imp.source, scope.filePath);

    if (!exported) return evalFail(`Cannot resolve import: ${imp.source}`);

    if (exported.has(imp.name)) return exported.get(imp.name)!;

    return evalFail(`Export '${imp.name}' not found in ${imp.source}`);
  }

  return evalFail(`Cannot resolve identifier: ${name}`);
}

function evaluateMember(node: BabelTypes.MemberExpression, scope: EvalScope): EvalResult {
  if (node.computed) {
    const key = evaluateNode(node.property as BabelTypes.Node, scope);
    if (!key.ok) return key;

    const obj = evaluateNode(node.object, scope);
    if (!obj.ok) return obj;

    if (obj.value && typeof obj.value === 'object') {
      return evalOk((obj.value as any)[key.value as string]);
    }

    return evalFail('Cannot index non-object');
  }

  const prop = (node.property as BabelTypes.Identifier).name;
  const obj = evaluateNode(node.object, scope);
  if (!obj.ok) return obj;

  if (obj.value == null) return evalFail(`Cannot access .${prop} on null/undefined`);
  if (typeof obj.value !== 'object' && typeof obj.value !== 'string') {
    return evalFail(`Cannot access .${prop} on ${typeof obj.value}`);
  }

  return evalOk((obj.value as any)[prop]);
}

function evaluateObject(node: BabelTypes.ObjectExpression, scope: EvalScope): EvalResult {
  const result: CompiledStyleObject = {};
  const locations: CompiledStyleObjectLocations = {};
  const props = node.properties;

  let i = 0;

  while (i < props.length) {
    const prop = props[i];

    if (prop.type === 'SpreadElement') {
      const v = evaluateNode(prop.argument, scope);
      if (!v.ok) return v;

      if (v.value && typeof v.value === 'object') {
        Object.assign(result, v.value);

        const sourceLocations = (v.value as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];
        if (sourceLocations) {
          const trace = scope.sourcemapTrace === 'value'
            ? TRACE_VALUE
            : TRACE_STYLE;
          const spreadLoc = prop.loc?.start;

          for (const [key, loc] of Object.entries(sourceLocations)) {
            locations[key] = trace === TRACE_STYLE && spreadLoc
              ? {
                line: spreadLoc.line,
                column: spreadLoc.column + 1,
                filePath: scope.styleFilePath ?? scope.filePath,
                trace,
              }
              : {
                ...loc,
                trace,
              };
          }
        }
      }
    } else if (prop.type === 'ObjectProperty') {
      let key: string;

      if (prop.computed) {
        const k = evaluateNode(prop.key as BabelTypes.Node, scope);
        if (!k.ok) return k;

        key = String(k.value);
      } else {
        key = prop.key.type === 'Identifier'
          ? prop.key.name
          : (prop.key as BabelTypes.StringLiteral).value;
      }

      const val = evaluateNode(prop.value as BabelTypes.Node, scope);

      if (!val.ok && isRequiredStaticStyleValueFail(val.reason)) return val;

      result[key] = val.ok
        ? val.value
        : createCompiledRuntimeValue(prop.value as BabelTypes.Expression);

      if (prop.loc?.start) {
        locations[key] = {
          line: prop.loc.start.line,
          column: prop.loc.start.column + 1,
          filePath: scope.styleFilePath ?? scope.filePath,
        };
      }
    } else {
      return evalFail(`Cannot evaluate ObjectMethod in style object`);
    }

    i++;
  }

  if (Object.keys(locations).length) {
    Object.defineProperty(result, COMPILED_STYLE_OBJECT_LOCATIONS, {
      configurable: true,
      enumerable: false,
      value: locations,
    });
  }

  return evalOk(result);
}

function evaluateArray(node: BabelTypes.ArrayExpression, scope: EvalScope): EvalResult {
  const result: unknown[] = [];
  const elements = node.elements;

  let i = 0;

  while (i < elements.length) {
    const el = elements[i];

    if (!el) {
      result.push(undefined);
    } else if (el.type === 'SpreadElement') {
      const v = evaluateNode(el.argument, scope);
      if (!v.ok) return v;

      if (Array.isArray(v.value)) {
        let j = 0;
        while (j < (v.value as unknown[]).length) {
          result.push((v.value as unknown[])[j]);
          j++;
        }
      }
    } else {
      const v = evaluateNode(el as BabelTypes.Node, scope);
      if (!v.ok) return v;

      result.push(v.value);
    }

    i++;
  }

  return evalOk(result);
}

function isRequiredStaticStyleValueFail(reason: string) {
  return reason.includes('createCounterStyle') ||
    reason.includes('createFontFace') ||
    reason.includes('createFontPaletteValues') ||
    reason.includes('createPositionTry') ||
    reason.includes('createProperty') ||
    reason.includes('createScrollTimeline') ||
    reason.includes('createViewTimeline') ||
    reason.includes('fontSrc');
}

function evaluateCall(node: BabelTypes.CallExpression, scope: EvalScope): EvalResult {
  if (node.callee.type === 'Identifier') {
    const imp = scope.imports.get(node.callee.name);

    if (imp && imp.source === IMPORT_EXTRACT && imp.name === FN_CREATE_EXTRACTED_STYLE) {
      const items = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!items.ok) return items;
      if (!Array.isArray(items.value)) return evalFail('createExtractedStyle items must be an array');

      return evalOk(createExtractedStyle(items.value as Parameters<typeof createExtractedStyle>[0]));
    }

    if (imp && imp.source === IMPORT_EXTRACT && imp.name === FN_CREATE_EXTRACTED_SLOT) {
      const slotId = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!slotId.ok) return slotId;

      const items = evaluateNode(node.arguments[1] as BabelTypes.Node, scope);
      if (!items.ok) return items;
      if (!Array.isArray(items.value)) return evalFail('createExtractedSlot items must be an array');

      return evalOk(
        createExtractedSlot(String(slotId.value), items.value as Parameters<typeof createExtractedSlot>[1]),
      );
    }

    if (imp && imp.source === IMPORT_EXTRACT && imp.name === FN_CREATE_EXTRACTED_SCOPE) {
      const items = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!items.ok) return items;
      if (!Array.isArray(items.value)) return evalFail('createExtractedScope items must be an array');

      return evalOk(createExtractedScope(items.value as Parameters<typeof createExtractedScope>[0]));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_TOKEN) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      return evalOk(createCompiledToken(value.value, scope, node.loc?.start, node, debugId.value));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_KEYFRAMES) {
      const frames = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!frames.ok) return frames;

      const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      const id = debugId.value ?? createCompiledAtRuleId(scope, node.loc?.start, frames.value);

      return evalOk(createCompiledAtRuleRef({
        type: AT_RULE_REF_TYPE_KEYFRAMES,
        keyPrefix: 'keyframes',
        value: createAtRuleName(id, 'kf', false, RUNTIME_CONFIG.classNamePrefix),
        buildCss: (name, tokens, tokenLookup, options) =>
          buildKeyframesCss(name, frames.value as KeyframesObject, tokens, tokenLookup, options),
      }));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_POSITION_TRY) {
      return evaluateDebugNamedAtRuleCall(node, scope, {
        label: 'createPositionTry',
        type: AT_RULE_REF_TYPE_POSITION_TRY,
        keyPrefix: 'position-try',
        namePrefix: 'pt',
        dashedName: true,
        buildCss: buildPositionTryCss as NamedAtRuleCssBuilder,
      });
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_COUNTER_STYLE) {
      return evaluateDebugNamedAtRuleCall(node, scope, {
        label: 'createCounterStyle',
        type: AT_RULE_REF_TYPE_COUNTER_STYLE,
        keyPrefix: 'counter-style',
        namePrefix: 'cs',
        buildCss: buildCounterStyleCss as NamedAtRuleCssBuilder,
      });
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_SCROLL_TIMELINE) {
      return evaluateDebugNamedAtRuleCall(node, scope, {
        label: 'createScrollTimeline',
        type: AT_RULE_REF_TYPE_SCROLL_TIMELINE,
        keyPrefix: 'scroll-timeline',
        namePrefix: 'st',
        dashedName: true,
        buildCss: buildScrollTimelineCss as NamedAtRuleCssBuilder,
      });
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_VIEW_TIMELINE) {
      return evaluateDebugNamedAtRuleCall(node, scope, {
        label: 'createViewTimeline',
        type: AT_RULE_REF_TYPE_VIEW_TIMELINE,
        keyPrefix: 'view-timeline',
        namePrefix: 'vtl',
        dashedName: true,
        buildCss: buildViewTimelineCss as NamedAtRuleCssBuilder,
      });
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_FONT_PALETTE_VALUES) {
      return evaluateDebugNamedAtRuleCall(node, scope, {
        label: 'createFontPaletteValues',
        type: AT_RULE_REF_TYPE_FONT_PALETTE_VALUES,
        keyPrefix: 'font-palette-values',
        namePrefix: 'fp',
        dashedName: true,
        buildCss: buildFontPaletteValuesCss as NamedAtRuleCssBuilder,
      });
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_PROPERTY) {
      const name = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!name.ok) return evalFail(`createProperty name must be statically analyzable: ${name.reason}`);
      if (typeof name.value !== 'string') return evalFail('createProperty name must be a static string');

      const descriptors = evaluateNode(node.arguments[1] as BabelTypes.Node, scope);
      if (!descriptors.ok) {
        return evalFail(`createProperty descriptors must be statically analyzable: ${descriptors.reason}`);
      }
      if (!descriptors.value || typeof descriptors.value !== 'object') {
        return evalFail('createProperty descriptors must be a static object');
      }

      const cssName = name.value as `--${string}`;
      if (!cssName.startsWith('--')) return evalFail('createProperty name must be a custom property name');

      return evalOk(createCompiledAtRuleRef({
        type: AT_RULE_REF_TYPE_PROPERTY,
        keyPrefix: 'property',
        value: cssName,
        buildCss: (atRuleName, tokens, tokenLookup, options) =>
          buildPropertyCss(
            atRuleName as `--${string}`,
            descriptors.value as PropertyObject,
            tokens,
            tokenLookup,
            options,
          ),
      }));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_FONT_FACE) {
      const descriptors = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!descriptors.ok) {
        return evalFail(`createFontFace descriptors must be statically analyzable: ${descriptors.reason}`);
      }
      if (!descriptors.value || typeof descriptors.value !== 'object') {
        return evalFail('createFontFace descriptors must be a static object');
      }
      if (typeof (descriptors.value as { src?: unknown; }).src !== 'string') {
        return evalFail('createFontFace src must be a static string');
      }

      const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      const id = debugId.value ?? createCompiledAtRuleId(scope, node.loc?.start, descriptors.value);

      const fontFaceDescriptors = descriptors.value as FontFaceObject;
      if (typeof fontFaceDescriptors.src !== 'string') {
        return evalFail('createFontFace src must be a static string');
      }

      return evalOk(createCompiledAtRuleRef({
        type: AT_RULE_REF_TYPE_FONT_FACE,
        keyPrefix: 'font-face',
        value: createAtRuleName(id, 'ff', false, RUNTIME_CONFIG.classNamePrefix),
        buildCss: (name, tokens, tokenLookup, options) =>
          buildFontFaceCss(name, fontFaceDescriptors, tokens, tokenLookup, options),
      }));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_FONT_SRC) {
      const url = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!url.ok) return evalFail(`fontSrc url must be statically analyzable: ${url.reason}`);
      if (typeof url.value !== 'string') return evalFail('fontSrc url must be a static string');

      const format = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
      if (!format.ok) return evalFail(`fontSrc format must be statically analyzable: ${format.reason}`);

      return evalOk(fontSrc(url.value, format.value));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_TOKENS) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      return evalOk(createCompiledTokens(value.value, scope, node.loc?.start, node, debugId.value));
    }

    if (imp && STYLE_IMPORT_PATHS.has(imp.source) && imp.name === FN_CREATE_VALUES) {
      const hasNumberArg = node.arguments[0]?.type === 'Identifier' &&
        (node.arguments[0] as BabelTypes.Identifier).name === 'Number';

      const valuesNode = hasNumberArg ? node.arguments[1] : node.arguments[0];
      const debugNode = hasNumberArg ? node.arguments[2] : node.arguments[1];

      const values = evaluateNode(valuesNode as BabelTypes.Node, scope);
      if (!values.ok) return values;

      const debugId = evaluateOptionalDebugId(debugNode as BabelTypes.Node, scope);
      if (!debugId.ok) return debugId;

      if (!Array.isArray(values.value)) {
        return evalFail('createValues values must be an array');
      }

      return evalOk(createCompiledValues(values.value, scope, node.loc?.start, node, debugId.value, hasNumberArg));
    }
  }

  if (node.callee.type === 'Identifier') {
    const token = evaluateIdentifier(node.callee, scope);

    if (token.ok && isStyleTokenData(token.value)) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      return evalOk(createCompiledTokenOverride(token.value, value.value, node));
    }

    if (token.ok && isCompiledTokenFactory(token.value)) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      const target = token.value.tokens.get(value.value);
      if (!target) return evalFail(`createValues value not found: ${String(value.value)}`);

      if (node.arguments.length > 1) {
        const provide = evaluateNode(node.arguments[1] as BabelTypes.Node, scope);
        if (!provide.ok) return provide;

        return evalOk(createCompiledTokenOverride(target, provide.value, node));
      }

      return evalOk(withRuntimeValue(node, target));
    }
  }

  if (node.callee.type === 'MemberExpression') {
    const token = evaluateMember(node.callee, scope);

    if (token.ok && isStyleTokenData(token.value)) {
      const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
      if (!value.ok) return value;

      return evalOk(createCompiledTokenOverride(token.value, value.value, node));
    }
  }

  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === FN_STYLE_KEYFRAMES &&
    node.callee.object.type === 'Identifier' &&
    scope.styleNames?.has(node.callee.object.name)
  ) {
    const frames = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
    if (!frames.ok) return frames;

    const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);
    if (!debugId.ok) return debugId;

    const id = debugId.value ?? createCompiledAtRuleId(scope, node.loc?.start, frames.value);
    const transformedFrames = transformKeyframes(frames.value as KeyframesObject, scope.styleTransform ?? null);

    return evalOk(createCompiledAtRuleRef({
      type: AT_RULE_REF_TYPE_KEYFRAMES,
      keyPrefix: 'keyframes',
      value: createAtRuleName(id, 'kf', false, RUNTIME_CONFIG.classNamePrefix),
      buildCss: (name, tokens, tokenLookup, options) =>
        buildKeyframesCss(name, transformedFrames, tokens, tokenLookup, options),
    }));
  }

  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === FN_STYLE_VALUE &&
    node.callee.object.type === 'Identifier' &&
    scope.styleNames?.has(node.callee.object.name)
  ) {
    const value = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
    if (!value.ok) return value;

    const weight = evaluateNode(node.arguments[1] as BabelTypes.Node, scope);
    if (!weight.ok) return weight;

    if (typeof weight.value !== 'number') {
      return evalFail('style.value weight must be a number');
    }

    return evalOk([weight.value, value.value]);
  }

  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    (node.callee.property.name === FN_STYLE_RAW || node.callee.property.name === FN_STYLE_PLAIN) &&
    node.callee.object.type === 'Identifier' &&
    scope.styleNames?.has(node.callee.object.name)
  ) {
    return evaluateNode(node.arguments[0] as BabelTypes.Node, scope);
  }

  return evalFail(`Cannot statically evaluate: ${node.type}`);
}

type NamedAtRuleCssBuilder = (
  name: string,
  descriptors: object,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  options?: AtRuleCssOptions,
) => string;

type NamedAtRuleConfig = {
  label: string;
  type: AtRuleRefType;
  keyPrefix: string;
  namePrefix: string;
  dashedName?: boolean;
  buildCss: NamedAtRuleCssBuilder;
};

function evaluateDebugNamedAtRuleCall(
  node: BabelTypes.CallExpression,
  scope: EvalScope,
  config: NamedAtRuleConfig,
): EvalResult {
  const descriptors = evaluateNode(node.arguments[0] as BabelTypes.Node, scope);

  if (!descriptors.ok) {
    return evalFail(`${config.label} descriptors must be statically analyzable: ${descriptors.reason}`);
  }

  if (!descriptors.value || typeof descriptors.value !== 'object') {
    return evalFail(`${config.label} descriptors must be a static object`);
  }

  const debugId = evaluateOptionalDebugId(node.arguments[1] as BabelTypes.Node, scope);

  if (!debugId.ok) {
    return evalFail(`${config.label} debugId must be statically analyzable: ${debugId.reason}`);
  }

  const id = debugId.value ?? createCompiledAtRuleId(scope, node.loc?.start, descriptors.value);
  const name = createAtRuleName(id, config.namePrefix, config.dashedName, RUNTIME_CONFIG.classNamePrefix);

  try {
    return evalOk(createCompiledAtRuleRef({
      type: config.type,
      keyPrefix: config.keyPrefix,
      value: name,
      buildCss: (atRuleName, tokens, tokenLookup, options) =>
        config.buildCss(atRuleName, descriptors.value as object, tokens, tokenLookup, options),
    }));
  } catch (error) {
    return evalFail(error instanceof Error ? error.message : String(error));
  }
}

function createCompiledAtRuleRef(config: {
  type: AtRuleRefType;
  keyPrefix: string;
  value: string;
  buildCss: (name: string, tokens: StyleTokenData[], tokenLookup: Set<string>, options?: AtRuleCssOptions) => string;
}): AtRuleRef {
  const tokens: StyleTokenData[] = [];
  const tokenLookup = new Set<string>();
  const css = config.buildCss(config.value, tokens, tokenLookup, createCompiledAtRuleCssOptions());

  return createAtRuleRef({
    type: config.type,
    key: config.keyPrefix + ':' + config.value,
    value: config.value,
    css,
    tokens: tokens.length ? tokens : undefined,
  });
}

function createCompiledAtRuleCssOptions(): AtRuleCssOptions {
  return {
    tokenVarPrefix: RUNTIME_CONFIG.tokenVarPrefix,
  };
}

function createCompiledTokenOverride(
  token: StyleTokenData,
  value: unknown,
  runtimeValue: BabelTypes.Expression,
): StyleTokenOverride {
  if (isStyleTokenData(value)) {
    return withRuntimeValue(runtimeValue, {
      [TOKEN_ID]: getStyleTokenId(token),
      [TOKEN_OVERRIDE]: true,
      value: value.value,
      ref: value,
    });
  }

  return withRuntimeValue(runtimeValue, {
    [TOKEN_ID]: getStyleTokenId(token),
    [TOKEN_OVERRIDE]: true,
    value,
    ref: null,
  });
}

function createCompiledToken(
  value: unknown,
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId?: string,
): StyleTokenData {
  let tokenId = debugId;

  if (!tokenId) {
    const hash = (scope.styleFilePath ?? scope.filePath) + '\n' +
      (loc ? loc.line + ':' + loc.column : String(value));

    tokenId = hashString(hash);
  }

  return withRuntimeValue(runtimeValue, {
    [TOKEN_ID]: tokenId,
    value,
    ref: null,
  });
}

function createCompiledTokens(
  value: unknown,
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId?: string,
) {
  const tokenGroupId = debugId ?? createCompiledTokenGroupId(scope, loc);

  if (Array.isArray(value)) {
    const result: Record<PropertyKey, unknown> = {};

    for (let i = 0, len = value.length; i < len; i++) {
      const item = value[i];

      result[item as PropertyKey] = createCompiledToken(
        item,
        scope,
        loc,
        runtimeValue,
        getChildDebugId(tokenGroupId, String(i)),
      );
    }

    return result;
  }

  if (!value || typeof value !== 'object') {
    return {};
  }

  const result: Record<PropertyKey, unknown> = {};

  assignCompiledTokenRecord(
    result,
    value as Record<PropertyKey, unknown>,
    scope,
    loc,
    runtimeValue,
    tokenGroupId,
  );

  return result;
}

function createCompiledTokenGroupId(
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
) {
  const hash = (scope.styleFilePath ?? scope.filePath) + '\n' +
    (loc ? loc.line + ':' + loc.column : 'createTokens');

  return hashString(hash);
}

function createCompiledAtRuleId(
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  value: unknown,
) {
  const hash = (scope.styleFilePath ?? scope.filePath) + '\n' +
    (loc ? loc.line + ':' + loc.column : String(value));

  return hashString(hash);
}

function assignCompiledTokenRecord(
  target: Record<PropertyKey, unknown>,
  value: Record<PropertyKey, unknown>,
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId?: string,
) {
  for (const key of Object.keys(value)) {
    const item = value[key];
    const itemDebugId = getChildDebugId(debugId, key);

    if (item && typeof item === 'object' && !Array.isArray(item) && !isStyleTokenData(item)) {
      const child: Record<PropertyKey, unknown> = {};

      target[key] = child;

      assignCompiledTokenRecord(
        child,
        item as Record<PropertyKey, unknown>,
        scope,
        loc,
        runtimeValue,
        itemDebugId,
      );
    } else {
      target[key] = createCompiledToken(
        item,
        scope,
        loc,
        runtimeValue,
        itemDebugId,
      );
    }
  }
}

function createCompiledValues(
  values: unknown[],
  scope: EvalScope,
  loc: { line: number; column: number; } | null | undefined,
  runtimeValue: BabelTypes.Expression,
  debugId: string | undefined,
  isNumber: boolean,
): CompiledTokenFactory {
  const tokens = new Map<unknown, StyleTokenData>();

  for (let i = 0, len = values.length; i < len; i++) {
    const value = values[i];

    tokens.set(
      value,
      createCompiledToken(
        parseCompiledValue(value, isNumber),
        scope,
        loc,
        runtimeValue,
        getChildDebugId(debugId, hashString(String(value))),
      ),
    );
  }

  return { [COMPILED_TOKEN_FACTORY]: true, tokens };
}

function parseCompiledValue(value: unknown, isNumber: boolean) {
  if (!isNumber) return value;

  const number = Number(value);
  if (!Number.isFinite(number)) return value;

  return number;
}

function isCompiledTokenFactory(value: unknown): value is CompiledTokenFactory {
  return !!value && typeof value === 'object' && (value as CompiledTokenFactory)[COMPILED_TOKEN_FACTORY] === true;
}

function evaluateOptionalDebugId(
  node: BabelTypes.Node | null | undefined,
  scope: EvalScope,
): EvalResult & { value?: string; } {
  if (!node) return evalOk(undefined) as EvalResult & { value?: string; };

  const value = evaluateNode(node, scope);
  if (!value.ok) return value;

  return evalOk(value.value === undefined ? undefined : String(value.value)) as EvalResult & { value?: string; };
}

function getChildDebugId(
  debugId: string | undefined,
  child: string,
) {
  return debugId ? debugId + '--' + child : undefined;
}

function withRuntimeValue<T extends StyleTokenData | StyleTokenOverride>(
  runtimeValue: BabelTypes.Expression,
  token: T,
): T {
  return Object.assign({}, token, {
    [TOKEN_ID]: token[TOKEN_ID],
    [COMPILED_RUNTIME_VALUE]: runtimeValue,
  });
}

function createCompiledRuntimeValue(
  runtimeValue: BabelTypes.Expression,
): CompiledRuntimeValue {
  return {
    [COMPILED_RUNTIME_VALUE]: runtimeValue,
  };
}

function evaluateBinary(node: BabelTypes.BinaryExpression, scope: EvalScope): EvalResult {
  const left = evaluateNode(node.left as BabelTypes.Node, scope);
  if (!left.ok) return left;

  const right = evaluateNode(node.right as BabelTypes.Node, scope);
  if (!right.ok) return right;

  switch (node.operator) {
    case '+':
      return evalOk((left.value as any) + (right.value as any));
    case '-':
      return evalOk((left.value as number) - (right.value as number));
    case '*':
      return evalOk((left.value as number) * (right.value as number));
    case '/':
      return evalOk((left.value as number) / (right.value as number));
    case '%':
      return evalOk((left.value as number) % (right.value as number));
    default:
      return evalFail(`Unsupported binary operator: ${node.operator}`);
  }
}

function evaluateUnary(node: BabelTypes.UnaryExpression, scope: EvalScope): EvalResult {
  const arg = evaluateNode(node.argument, scope);
  if (!arg.ok) return arg;

  switch (node.operator) {
    case '-':
      return evalOk(-(arg.value as number));
    case '+':
      return evalOk(+(arg.value as number));
    case '!':
      return evalOk(!arg.value);
    default:
      return evalFail(`Unsupported unary operator: ${node.operator}`);
  }
}
