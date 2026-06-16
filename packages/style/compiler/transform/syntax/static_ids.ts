import type { types as BabelTypes } from '@babel/core';
import { createThemeClassName } from '../../../atomic/theme';
import { sanitizeCssIdentName } from '../../../atomic/utils/css';
import { hashString } from '../../../utils/hash';
import {
  DEFAULT_CONFIG,
  FN_CREATE_COUNTER_STYLE,
  FN_CREATE_FONT_FACE,
  FN_CREATE_FONT_PALETTE_VALUES,
  FN_CREATE_KEYFRAMES,
  FN_CREATE_POSITION_TRY,
  FN_CREATE_SCROLL_TIMELINE,
  FN_CREATE_THEME,
  FN_CREATE_TOKEN,
  FN_CREATE_TOKENS,
  FN_CREATE_VALUES,
  FN_CREATE_VIEW_TIMELINE,
  FN_STYLE_KEYFRAMES,
  IMPORT_PATHS,
} from '../../utils/constants';
import { getObjectPropertyKey } from './utils';

export type StaticIdImport = {
  source: string;
  name: string;
};

export type StaticIdState = {
  fileId: string;
  imports: Map<string, StaticIdImport>;
  styleNames?: Set<string>;
};

export function annotateTokenDeclaration(
  decl: BabelTypes.VariableDeclarator,
  state: StaticIdState,
  t: typeof BabelTypes,
) {
  if (decl.id.type !== 'Identifier' || !decl.init) return;

  annotateTokenExpression(decl.init, decl.id.name, state, t);
}

export function annotateAtRuleDeclaration(
  decl: BabelTypes.VariableDeclarator,
  state: StaticIdState,
  t: typeof BabelTypes,
) {
  if (decl.id.type !== 'Identifier' || !decl.init) return;

  annotateAtRuleExpression(decl.init, decl.id.name, state, t);
}

export function annotateThemeCall(
  node: BabelTypes.CallExpression,
  state: StaticIdState,
  t: typeof BabelTypes,
) {
  if (node.callee.type !== 'Identifier') return;

  const imp = state.imports.get(node.callee.name);

  if (!imp || !IMPORT_PATHS.includes(imp.source) || imp.name !== FN_CREATE_THEME) {
    return;
  }

  const loc = node.loc?.start;
  const locId = loc ? loc.line + ':' + loc.column : 'createTheme';
  setStringArgWithStableId(
    node,
    1,
    getStableThemeId(state.fileId, locId),
    state.fileId,
    locId,
    t,
  );
}

export function getStableThemeId(fileId: string, locId: string) {
  return hashString(fileId + '\n' + locId);
}

export function getStableThemeClassName(
  id: string,
  config: {
    classNamePrefix?: string;
    themeNamePrefix?: string;
  },
) {
  return createThemeClassName(id, {
    classNamePrefix: config.classNamePrefix ?? DEFAULT_CONFIG.classNamePrefix,
    themeNamePrefix: config.themeNamePrefix ?? DEFAULT_CONFIG.themeNamePrefix,
  });
}

function annotateTokenExpression(
  node: BabelTypes.Node,
  pathName: string,
  state: StaticIdState,
  t: typeof BabelTypes,
) {
  if (node.type === 'CallExpression') {
    annotateTokenFactoryCall(node, pathName, state, t);
    return;
  }

  if (node.type !== 'ObjectExpression') return;

  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty' || prop.computed) continue;

    const key = getObjectPropertyKey(prop);
    if (!key) continue;

    annotateTokenExpression(prop.value as BabelTypes.Node, pathName + '.' + key, state, t);
  }
}

function annotateAtRuleExpression(
  node: BabelTypes.Node,
  pathName: string,
  state: StaticIdState,
  t: typeof BabelTypes,
) {
  if (node.type === 'CallExpression') {
    annotateAtRuleFactoryCall(node, pathName, state, t);
    return;
  }

  if (node.type !== 'ObjectExpression') return;

  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty' || prop.computed) continue;

    const key = getObjectPropertyKey(prop);
    if (!key) continue;

    annotateAtRuleExpression(prop.value as BabelTypes.Node, pathName + '.' + key, state, t);
  }
}

function annotateAtRuleFactoryCall(
  node: BabelTypes.CallExpression,
  pathName: string,
  state: StaticIdState,
  t: typeof BabelTypes,
) {
  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    state.styleNames?.has(node.callee.object.name) &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === FN_STYLE_KEYFRAMES
  ) {
    setStringArgWithStableId(node, 1, getStableTokenId(state.fileId, pathName), state.fileId, pathName, t);
    return;
  }

  if (node.callee.type !== 'Identifier') return;

  const imp = state.imports.get(node.callee.name);
  if (!imp || !IMPORT_PATHS.includes(imp.source)) return;
  if (!AT_RULE_FACTORY_NAMES.has(imp.name)) return;

  setStringArgWithStableId(node, 1, getStableTokenId(state.fileId, pathName), state.fileId, pathName, t);
}

const AT_RULE_FACTORY_NAMES = new Set([
  FN_CREATE_COUNTER_STYLE,
  FN_CREATE_FONT_FACE,
  FN_CREATE_FONT_PALETTE_VALUES,
  FN_CREATE_KEYFRAMES,
  FN_CREATE_POSITION_TRY,
  FN_CREATE_SCROLL_TIMELINE,
  FN_CREATE_VIEW_TIMELINE,
]);

function annotateTokenFactoryCall(
  node: BabelTypes.CallExpression,
  pathName: string,
  state: StaticIdState,
  t: typeof BabelTypes,
) {
  if (node.callee.type !== 'Identifier') return;

  const imp = state.imports.get(node.callee.name);
  if (!imp || !IMPORT_PATHS.includes(imp.source)) return;

  if (imp.name === FN_CREATE_TOKEN) {
    setStringArgWithStableId(node, 1, getStableTokenId(state.fileId, pathName), state.fileId, pathName, t);
    return;
  }

  if (imp.name === FN_CREATE_TOKENS) {
    setStringArgWithStableId(node, 1, getStableTokenId(state.fileId, pathName), state.fileId, pathName, t);
    return;
  }

  if (imp.name === FN_CREATE_VALUES) {
    const hasNumberArg = node.arguments[0]?.type === 'Identifier' &&
      (node.arguments[0] as BabelTypes.Identifier).name === 'Number';
    setStringArgWithStableId(
      node,
      hasNumberArg ? 2 : 1,
      getStableTokenId(state.fileId, pathName),
      state.fileId,
      pathName,
      t,
    );
  }
}

function setStringArgWithStableId(
  node: BabelTypes.CallExpression,
  index: number,
  value: string,
  fileId: string,
  pathName: string,
  t: typeof BabelTypes,
) {
  const existing = node.arguments[index];

  if (existing) {
    if (existing.type === 'StringLiteral') {
      node.arguments[index] = t.stringLiteral(getStableDebugId(existing.value, fileId, pathName));
    }

    return;
  }

  while (node.arguments.length < index) {
    node.arguments.push(t.identifier('undefined'));
  }

  node.arguments.push(t.stringLiteral(value));
}

function getStableTokenId(
  fileId: string,
  pathName: string,
) {
  return sanitizeTokenId(pathName) + '-' + hashString(fileId + '\n' + pathName);
}

function getStableDebugId(
  debugId: string,
  fileId: string,
  pathName: string,
) {
  return sanitizeTokenId(debugId) + '-' + hashString(fileId + '\n' + pathName);
}

function sanitizeTokenId(value: string) {
  return sanitizeCssIdentName(value, 'token');
}
