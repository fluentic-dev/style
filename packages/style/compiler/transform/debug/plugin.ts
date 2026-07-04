import { SELECTOR_MERGE } from '../../../builder/data/selector';
import { BUILDER_STATE } from '../../../builder/data/const';
import { TRACE_STYLE, TRACE_VALUE, type DebugLoc } from '../../../builder/data/debug';
import { isScopeData, isStyleData } from '../../../builder/data/is';
import type { RuntimeItem } from '../../../builder/data/state';
import type { CheckSelectorMode, SourcemapLocationMode } from '../../../config/types';
import type { StyleFnMeta } from '../../../style/style';
import { isStyleTokenData } from '../../../style/token';
import type { CompilerOptions } from '../../compiler/types';
import {
  DEBUG_SOURCE_CONTENT_VAR,
  DEBUG_SOURCE_URL_VAR,
  DEFAULT_CONFIG,
  FN_STYLE_KEYFRAMES,
  FN_STYLE_MERGE,
  FN_STYLE_PLAIN,
  FN_STYLE_RAW,
  FN_STYLE_SCOPE,
  FN_CREATE_THEME,
  IMPORT_PATHS,
} from '../../utils/constants';
import { createImportSourceMatcher, type ImportSourceMatcher } from '../../utils/import_source';
import {
  COMPILED_STYLE_OBJECT_LOCATIONS,
  type CompiledStyleObject,
  type CompiledStyleObjectLocations,
  type EvalScope,
  evaluateNode,
} from '../evaluator/evaluator';
import type { EvalModuleBindings, ImportMap, ResolveImportFn } from '../evaluator/types';
import type { ExtractTracer } from '../extract/plugin';
import {
  annotateAtRuleDeclaration,
  annotateThemeCall,
  annotateTokenDeclaration,
  getImportedName,
  isStyleChainCall,
} from '../syntax';
import type { BabelCore, BabelTypes, NodePath } from '../utils/babel';
import { babelPlugin } from '../utils/babel';
import { getProjectFileId } from '../utils/path';
import { getSelectorArgIndex, validateResolvedSelectorValue, validateSelectorDefinition } from '../utils/selector';
import { buildDebugDataObject, type DebugTraceProperty, hasDebugArgument } from './utils/debug_data';
import { getDebugSourceUrl } from './utils/source_url';

type PluginState = BabelCore.PluginPass & {
  options: CompilerOptions;
  projectDir: string;
  styleNames: Set<string>;
  styleMetas: Map<string, StyleFnMeta>;
  bindings: EvalModuleBindings;
  imports: ImportMap;
  resolveImport: ResolveImportFn;
  importSourceMatcher: ImportSourceMatcher;
  checkSelector: CheckSelectorMode | undefined;
  filePath: string;
  fileId: string;
  sourcemapTrace: SourcemapTrace;
  programPath: NodePath<BabelTypes.Program> | null;
  sourceUrlId: BabelTypes.Identifier | null;
  sourceContentId: BabelTypes.Identifier | null;
};

type PluginArgs = {
  options: CompilerOptions;
  projectDir: string;
  sourceUrl: string;
  sourceContent: string | null;
  tracer: ExtractTracer;
};

type SourcemapTrace = SourcemapLocationMode;

type BabelBinding = {
  identifier: BabelTypes.Identifier;
  referencePaths: NodePath[];
};

export function createDebugPlugin(args: PluginArgs) {
  const { options, projectDir, sourceUrl, sourceContent } = args;

  return babelPlugin<PluginState>((babel) => {
    const { types: t } = babel;

    return {
      pre(this: PluginState) {
        this.options = options;
        this.projectDir = projectDir;
        this.styleNames = new Set();
        this.styleMetas = new Map();
        this.bindings = new Map();
        this.imports = new Map();
        this.resolveImport = (source, fromFile) => args.tracer.resolveImport(babel, source, fromFile);
        this.importSourceMatcher = createImportSourceMatcher(options.importSources ?? null);
        this.checkSelector = options.dev?.checkSelector;
        this.filePath = this.file?.opts?.filename ?? 'unknown';
        this.fileId = getProjectFileId(projectDir, this.file?.opts?.filename);
        this.sourcemapTrace = options.dev?.sourcemapMode ?? 'style';
        this.programPath = null;
        this.sourceUrlId = null;
        this.sourceContentId = null;
      },
      visitor: {
        Program: {
          enter(path: NodePath<BabelTypes.Program>, state: PluginState) {
            state.programPath = path;
          },
          exit(path: NodePath<BabelTypes.Program>, state: PluginState) {
            insertDebugDeclarations(t, path, state, sourceUrl, sourceContent);
          },
        },

        ImportDeclaration(
          path: NodePath<BabelTypes.ImportDeclaration>,
          state: PluginState,
        ) {
          const source = path.node.source.value;
          if (typeof source !== 'string') return;

          path.node.specifiers.forEach((spec) => {
            if (spec.type === 'ImportSpecifier') {
              state.imports.set(spec.local.name, { source, name: getImportedName(spec) });
            } else if (spec.type === 'ImportDefaultSpecifier') {
              state.imports.set(spec.local.name, { source, name: 'default' });
            }
          });

          path.node.specifiers.forEach((spec) => {
            if (spec.type !== 'ImportSpecifier' && spec.type !== 'ImportDefaultSpecifier') return;

            const imported = spec.type === 'ImportSpecifier'
              ? getImportedName(spec)
              : 'default';

            const meta = state.importSourceMatcher({ source, name: imported });
            if (meta) {
              state.styleNames.add(spec.local.name);
              state.styleMetas.set(spec.local.name, meta);
            }
          });
        },

        VariableDeclaration(path, state) {
          path.node.declarations.forEach((decl) => {
            annotateTokenDeclaration(decl, state, t);
            annotateAtRuleDeclaration(decl, state, t);

            if (decl.id.type !== 'Identifier' || !decl.init) return;

            state.bindings.set(
              decl.id.name,
              evaluateNode(decl.init, getDebugEvalScope(state)),
            );
          });
        },

        CallExpression(
          path: NodePath<BabelTypes.CallExpression>,
          state: PluginState,
        ) {
          annotateThemeCall(path.node, state, t);
          annotateThemeCallsite(t, path, state, sourceContent);

          if (!state.styleNames.size) return;
          validateStaticSelectorArg(path, state);
          if (isStyleUtilityCall(path.node.callee, state.styleNames)) return;
          const isScopeMerge = isScopeMergeCall(path.node.callee, state);
          if (
            (isScopeChainCall(path.node.callee, state.styleNames) && !isScopeMerge) ||
            (
              !isStyleChainCall(path.node.callee, state.styleNames) &&
              !isScopeItemCall(path, state) &&
              !isScopeMerge
            )
          ) return;
          const evaluated = evaluateNode(path.node, getDebugEvalScope(state));
          if (evaluated.ok && isStyleTokenData(evaluated.value)) return;
          if (hasDebugArgument(path.node.arguments)) return;

          const sourceUrlRef = getSourceUrlId(t, state);
          const sourceContentRef = sourceContent
            ? getSourceContentId(t, state)
            : null;

          path.node.arguments.push(
            buildDebugDataObject(
              t,
              path.node,
              state.fileId,
              sourceUrlRef,
              sourceContentRef,
              options.css?.tokenNameFormat ?? DEFAULT_CONFIG.tokenNameFormat,
              getDebugStyleArg(t, path, state, options.dev?.sourcemapMode ?? 'style'),
              getDebugCallLoc(path, state),
            ),
          );
        },

        JSXOpeningElement(
          path: NodePath<BabelTypes.JSXOpeningElement>,
          state: PluginState,
        ) {
          if (options.dev?.elementClassName === false) return;
          if (!isHostJsxElement(path.node.name)) return;

          const cssAttr = getJsxAttribute(path.node, 'css');
          if (!cssAttr) return;

          const loc = path.node.loc?.start;
          if (!loc) return;

          const sourceUrlRef = getSourceUrlId(t, state);
          const sourceContentRef = sourceContent
            ? getSourceContentId(t, state)
            : null;

          const debugInfo = getElementDebugInfo(cssAttr);
          const label = debugInfo.label || getShortFileLabel(state.fileId);
          const debug = buildElementDebugDataObject(
            t,
            loc.line,
            loc.column + 1,
            label,
            sourceUrlRef,
            sourceContentRef,
          );

          wrapCssAttributeWithElementDebug(t, cssAttr, debug);
        },
      },
    };
  });
}

function annotateThemeCallsite(
  t: typeof BabelTypes,
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
  sourceContent: string | null,
) {
  if (!isCreateThemeCall(path.node, state)) return;
  if (path.node.arguments[2]) return;

  const loc = path.node.loc?.start;
  if (!loc) return;

  while (path.node.arguments.length < 2) {
    path.node.arguments.push(t.identifier('undefined'));
  }

  const line = loc.line;
  const column = loc.column + 1;
  const sourceUrlRef = getSourceUrlId(t, state);
  const sourceContentRef = sourceContent ? getSourceContentId(t, state) : null;

  path.node.arguments.push(t.objectExpression([
    t.objectProperty(
      t.identifier('stack'),
      t.binaryExpression(
        '+',
        t.binaryExpression(
          '+',
          t.binaryExpression(
            '+',
            t.stringLiteral('Error\\n    at '),
            sourceUrlRef,
          ),
          t.stringLiteral(':' + line + ':' + column),
        ),
        t.stringLiteral(''),
      ),
    ),
    t.objectProperty(t.identifier('filePath'), sourceUrlRef),
    t.objectProperty(t.identifier('sourceUrl'), sourceUrlRef),
    ...(sourceContentRef
      ? [t.objectProperty(t.identifier('sourceContent'), sourceContentRef)]
      : []),
    t.objectProperty(t.identifier('line'), t.numericLiteral(line)),
    t.objectProperty(t.identifier('column'), t.numericLiteral(column)),
  ]));
}

function isCreateThemeCall(
  node: BabelTypes.CallExpression,
  state: PluginState,
) {
  if (node.callee.type !== 'Identifier') return false;

  const imp = state.imports.get(node.callee.name);

  return !!imp && IMPORT_PATHS.includes(imp.source) && imp.name === FN_CREATE_THEME;
}

function isHostJsxElement(name: BabelTypes.JSXOpeningElement['name']) {
  if (name.type !== 'JSXIdentifier') return false;

  const first = name.name.charCodeAt(0);
  return first >= 97 && first <= 122;
}

function getJsxAttribute(
  node: BabelTypes.JSXOpeningElement,
  name: string,
) {
  for (const attr of node.attributes) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name.type !== 'JSXIdentifier') continue;
    if (attr.name.name === name) return attr;
  }

  return null;
}

type ElementDebugInfo = {
  label: string;
  loc: BabelTypes.SourceLocation['start'] | null;
};

function getElementDebugInfo(attr: BabelTypes.JSXAttribute): ElementDebugInfo {
  const value = attr.value;
  if (!value || value.type !== 'JSXExpressionContainer') return { label: '', loc: null };

  return getExpressionDebugInfo(value.expression);
}

function wrapCssAttributeWithElementDebug(
  t: typeof BabelTypes,
  attr: BabelTypes.JSXAttribute,
  debug: BabelTypes.ObjectExpression,
) {
  const value = attr.value;
  if (!value || value.type !== 'JSXExpressionContainer') return;

  const expression = value.expression;
  if (expression.type === 'JSXEmptyExpression') return;

  if (expression.type === 'ArrayExpression') {
    expression.elements.unshift(debug);
    return;
  }

  value.expression = t.arrayExpression([debug, expression]);
}

function buildElementDebugDataObject(
  t: typeof BabelTypes,
  line: number,
  column: number,
  label: string,
  sourceUrlRef: BabelTypes.Expression,
  sourceContentRef: BabelTypes.Expression | null,
) {
  return t.objectExpression([
    t.objectProperty(
      t.identifier('$$elementDebug'),
      t.booleanLiteral(true),
    ),
    t.objectProperty(
      t.identifier('loc'),
      t.arrayExpression([
        t.numericLiteral(line),
        t.numericLiteral(column),
      ]),
    ),
    t.objectProperty(
      t.identifier('label'),
      t.stringLiteral(label),
    ),
    t.objectProperty(
      t.identifier('sourceUrl'),
      sourceUrlRef,
    ),
    ...sourceContentRef
      ? [
        t.objectProperty(
          t.identifier('code'),
          sourceContentRef,
        ),
      ]
      : [],
  ]);
}

function getExpressionDebugInfo(node: BabelTypes.JSXExpressionContainer['expression']): ElementDebugInfo {
  if (node.type === 'JSXEmptyExpression') return { label: '', loc: null };

  if (node.type === 'ArrayExpression') {
    for (const element of node.elements) {
      if (!element || element.type === 'SpreadElement') continue;

      const info = getExpressionDebugInfo(element);
      if (info.label) return info;
    }

    return { label: '', loc: null };
  }

  if (node.type === 'MemberExpression' && !node.computed) {
    if (node.property.type === 'Identifier') {
      return { label: node.property.name, loc: node.loc?.start ?? node.property.loc?.start ?? null };
    }

    if (node.property.type === 'PrivateName') {
      return { label: node.property.id.name, loc: node.loc?.start ?? node.property.loc?.start ?? null };
    }
  }

  if (node.type === 'MemberExpression' && node.computed && node.property.type === 'StringLiteral') {
    return { label: node.property.value, loc: node.loc?.start ?? node.property.loc?.start ?? null };
  }

  if (node.type === 'Identifier') {
    return { label: node.name, loc: node.loc?.start ?? null };
  }

  return { label: '', loc: null };
}

function getShortFileLabel(filePath: string) {
  const normalized = filePath.split(/[?#]/, 1)[0] || filePath;
  const fileName = normalized.split(/[\\/]/).pop() || 'element';
  const index = fileName.lastIndexOf('.');

  return index > 0 ? fileName.slice(0, index) : fileName;
}

function validateStaticSelectorArg(
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
) {
  const methodName = getSelectorMethodName(path.node.callee);
  if (!methodName) return;

  const rootName = getStyleChainRootName(path.node.callee, state.styleNames);
  if (!rootName) return;

  const selector = state.styleMetas.get(rootName)?.selectors[methodName];
  if (!selector) return;
  if (!isStyleChainCall(path.node.callee, state.styleNames) && !isScopeItemCall(path, state)) return;

  try {
    validateSelectorDefinition(
      state.checkSelector,
      `style.${methodName}`,
      selector,
      getSelectorMethodNode(path.node.callee),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const methodPath = getSelectorMethodPath(path);
    throw (methodPath ?? path).buildCodeFrameError(message);
  }

  const argIndex = getSelectorArgIndex(selector, path.node.arguments as BabelTypes.Node[]);
  if (argIndex === null) return;

  try {
    validateResolvedSelectorValue(
      state.checkSelector,
      `style.${methodName}`,
      selector,
      evaluateNode(
        path.node.arguments[argIndex] as BabelTypes.Node | undefined,
        getDebugEvalScope(state),
      ),
      path.node.arguments[argIndex] as BabelTypes.Node | undefined,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const argPath = path.get(`arguments.${argIndex}`) as NodePath<BabelTypes.Node>;
    throw argPath.buildCodeFrameError(message);
  }
}

function getDebugEvalScope(state: PluginState): EvalScope {
  return {
    bindings: state.bindings,
    imports: state.imports,
    resolveImport: state.resolveImport,
    filePath: state.filePath,
    styleFilePath: state.filePath,
    sourcemapTrace: state.sourcemapTrace,
    styleNames: state.styleNames,
    styleMetas: state.styleMetas,
  };
}

function getStyleChainRootName(
  callee: BabelTypes.CallExpression['callee'],
  styleNames: Set<string>,
): string | null {
  if (callee.type === 'Identifier') {
    return styleNames.has(callee.name) ? callee.name : null;
  }

  if (callee.type !== 'MemberExpression' || callee.computed) return null;

  const object = callee.object;

  if (object.type === 'Identifier') {
    return styleNames.has(object.name) ? object.name : null;
  }

  if (object.type === 'CallExpression') {
    return getStyleChainRootName(object.callee, styleNames);
  }

  if (object.type === 'MemberExpression') {
    return getStyleChainRootName(object, styleNames);
  }

  return null;
}

function getSelectorMethodName(
  callee: BabelTypes.CallExpression['callee'],
) {
  const node = getSelectorMethodNode(callee);
  return node?.type === 'Identifier' ? node.name : null;
}

function getSelectorMethodNode(
  callee: BabelTypes.CallExpression['callee'],
) {
  if (callee.type !== 'MemberExpression' || callee.computed) return null;
  return callee.property.type === 'Identifier' ? callee.property : null;
}

function getSelectorMethodPath(
  path: NodePath<BabelTypes.CallExpression>,
) {
  const callee = path.get('callee');
  if (!callee.isMemberExpression()) return null;

  const property = callee.get('property');
  if (Array.isArray(property)) return null;
  if (!property.isIdentifier()) return null;

  return property;
}

function getDebugStyleArg(
  t: typeof BabelTypes,
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
) {
  const arg = getStyleObjectArg(path, state);
  if (!arg) return arg;

  if (arg.type !== 'ObjectExpression') {
    return resolveDebugMergeObject(t, arg, path, state, sourcemapTrace) ?? arg;
  }

  return flattenDebugObjectExpression(
    t,
    arg,
    path,
    state,
    sourcemapTrace,
    new Set(),
  );
}

function getDebugCallLoc(
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
) {
  return (isSelectorStyleCall(path, state) || isScopeItemSelectorCall(path, state))
    ? getMergeStyleLoc(path.node.callee)
    : null;
}

function getStyleObjectArg(
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
) {
  const methodName = getSelectorMethodName(path.node.callee);
  const rootName = getStyleChainRootName(path.node.callee, state.styleNames);
  const selector = methodName && rootName
    ? state.styleMetas.get(rootName)?.selectors[methodName]
    : null;

  if (!selector) return path.node.arguments[0];

  const selectorArgIndex = getSelectorArgIndex(selector, path.node.arguments as BabelTypes.Node[]);
  const styleArgIndex = selectorArgIndex === null ? 0 : selectorArgIndex + 1;

  return path.node.arguments[styleArgIndex];
}

function isSelectorStyleCall(
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
) {
  const methodName = getSelectorMethodName(path.node.callee);
  if (!methodName) return false;

  const rootName = getStyleChainRootName(path.node.callee, state.styleNames);
  if (!rootName) return false;

  return !!state.styleMetas.get(rootName)?.selectors[methodName];
}

function resolveDebugMergeObject(
  t: typeof BabelTypes,
  arg: BabelTypes.Node,
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
) {
  if (!isMergeSelectorCall(path.node.callee, state) && !isScopeItemMergeCall(path, state)) return null;

  const loc = getMergeStyleLoc(path.node.callee);
  if (sourcemapTrace === 'style' && !loc) return null;

  const localSource = resolveStyleDebugObject(t, arg, path, state, sourcemapTrace, new Set());
  const source = (localSource?.properties.length ? localSource : null) ??
    resolveImportedMergeDebugObject(t, arg, loc, state, sourcemapTrace);
  if (!source) return null;

  return createTraceDebugObject(t, source, loc ?? arg.loc?.start ?? null, sourcemapTrace);
}

function isScopeItemMergeCall(
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
) {
  return getSelectorMethodName(path.node.callee) === FN_STYLE_MERGE && isScopeItemCall(path, state);
}

function isScopeItemSelectorCall(
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
) {
  const callee = path.node.callee;
  return callee.type === 'MemberExpression' &&
    callee.object.type === 'CallExpression' &&
    isScopeItemCall(path, state);
}

function resolveImportedMergeDebugObject(
  t: typeof BabelTypes,
  arg: BabelTypes.Node,
  loc: BabelTypes.SourceLocation['start'] | null,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
) {
  if (arg.type !== 'Identifier') return null;

  const evaluated = evaluateNode(arg, getDebugEvalScope(state));
  if (!evaluated.ok || (!isStyleData(evaluated.value) && !isScopeData(evaluated.value))) return null;

  const locations = (evaluated.value as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];
  if (locations) {
    return createLocationDebugObject(t, locations, loc, state, sourcemapTrace);
  }

  return createStyleDataDebugObject(
    t,
    evaluated.value[BUILDER_STATE].items,
    loc,
    state,
    sourcemapTrace,
  );
}

function isScopeMergeCall(
  callee: BabelTypes.CallExpression['callee'],
  state: PluginState,
) {
  const methodName = getSelectorMethodName(callee);
  if (!methodName) return false;

  const rootName = getStyleChainRootName(callee, state.styleNames);
  if (!rootName) return false;

  const selector = state.styleMetas.get(rootName)?.selectors[methodName];
  return selector?.selector.trim() === SELECTOR_MERGE && isScopeChainCall(callee, state.styleNames);
}

function isMergeSelectorCall(
  callee: BabelTypes.CallExpression['callee'],
  state: PluginState,
) {
  const methodName = getSelectorMethodName(callee);
  if (!methodName) return false;

  const rootName = getStyleChainRootName(callee, state.styleNames);
  if (!rootName) return false;

  return state.styleMetas.get(rootName)?.selectors[methodName]?.selector.trim() === SELECTOR_MERGE;
}

function getMergeStyleLoc(callee: BabelTypes.CallExpression['callee']) {
  const node = getSelectorMethodNode(callee);
  return node?.loc?.start ?? callee.loc?.start ?? null;
}

function resolveStyleDebugObject(
  t: typeof BabelTypes,
  node: BabelTypes.Node,
  path: NodePath,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
  seen: Set<string>,
): BabelTypes.ObjectExpression | null {
  if (node.type === 'Identifier') {
    if (seen.has(node.name)) return null;

    const binding = path.scope.getBinding(node.name);
    const init = binding?.path.isVariableDeclarator()
      ? binding.path.node.init
      : null;

    if (!init) return null;

    seen.add(node.name);
    try {
      return resolveStyleDebugObject(t, init, path, state, sourcemapTrace, seen);
    } finally {
      seen.delete(node.name);
    }
  }

  if (node.type === 'ArrayExpression') {
    const properties: BabelTypes.ObjectExpression['properties'] = [];

    for (const element of node.elements) {
      if (!element || element.type === 'SpreadElement') continue;

      const resolved = resolveStyleDebugObject(t, element, path, state, sourcemapTrace, seen);
      if (resolved) properties.push(...resolved.properties);
    }

    return properties.length ? t.objectExpression(properties) : null;
  }

  if (node.type !== 'CallExpression') return null;

  if (
    isStyleUtilityCall(node.callee, state.styleNames) &&
    node.arguments[0]?.type === 'ObjectExpression'
  ) {
    return flattenDebugObjectExpression(
      t,
      node.arguments[0],
      path,
      state,
      sourcemapTrace,
      seen,
    );
  }

  if (!isStyleChainCall(node.callee, state.styleNames)) return null;

  const properties: BabelTypes.ObjectExpression['properties'] = [];
  collectStyleChainDebugProperties(t, node, path, state, sourcemapTrace, seen, properties);

  return properties.length ? t.objectExpression(properties) : null;
}

function collectStyleChainDebugProperties(
  t: typeof BabelTypes,
  node: BabelTypes.CallExpression,
  path: NodePath,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
  seen: Set<string>,
  properties: BabelTypes.ObjectExpression['properties'],
) {
  const callee = node.callee;

  if (callee.type === 'MemberExpression' && callee.object.type === 'CallExpression') {
    collectStyleChainDebugProperties(
      t,
      callee.object,
      path,
      state,
      sourcemapTrace,
      seen,
      properties,
    );
  }

  const arg = node.arguments[0];
  if (!arg) return;

  if (arg.type === 'ObjectExpression') {
    const flattened = flattenDebugObjectExpression(t, arg, path, state, sourcemapTrace, seen);
    properties.push(...flattened.properties);
    return;
  }

  if (isMergeSelectorCall(callee, state)) {
    const merged = resolveStyleDebugObject(t, arg, path, state, sourcemapTrace, seen);
    if (merged) properties.push(...merged.properties);
  }
}

function flattenDebugObjectExpression(
  t: typeof BabelTypes,
  node: BabelTypes.ObjectExpression,
  path: NodePath,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
  seen: Set<string>,
) {
  const properties: BabelTypes.ObjectExpression['properties'] = [];

  for (const property of node.properties) {
    if (property.type !== 'SpreadElement') {
      properties.push(property);
      continue;
    }

    const resolved = resolveDebugSpreadObject(
      t,
      property,
      path,
      state,
      sourcemapTrace,
      seen,
    );

    if (resolved) {
      properties.push(...resolved.properties);
    }
  }

  return t.objectExpression(properties);
}

function resolveDebugSpreadObject(
  t: typeof BabelTypes,
  spread: BabelTypes.SpreadElement,
  path: NodePath,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
  seen: Set<string>,
) {
  const node = spread.argument;
  if (node.type !== 'Identifier') return null;
  if (seen.has(node.name)) return null;

  const binding = path.scope.getBinding(node.name);
  const init = binding?.path.isVariableDeclarator()
    ? binding.path.node.init
    : null;

  if (!init) {
    return resolveImportedDebugSpreadObject(t, node, spread, state, sourcemapTrace);
  }

  seen.add(node.name);

  try {
    if (init.type === 'ObjectExpression') {
      return createSpreadDebugObject(t, init, spread, sourcemapTrace);
    }

    if (
      init.type === 'CallExpression' &&
      isStyleUtilityCall(init.callee, state.styleNames) &&
      init.arguments[0]?.type === 'ObjectExpression'
    ) {
      return createSpreadDebugObject(t, init.arguments[0], spread, sourcemapTrace);
    }

    return null;
  } finally {
    seen.delete(node.name);
  }
}

function resolveImportedDebugSpreadObject(
  t: typeof BabelTypes,
  node: BabelTypes.Identifier,
  spread: BabelTypes.SpreadElement,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
) {
  const evaluated = evaluateNode(node, getDebugEvalScope(state));
  if (!evaluated.ok || !evaluated.value || typeof evaluated.value !== 'object') return null;

  const locations = (evaluated.value as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];
  if (!locations) return null;

  return createLocationDebugObject(t, locations, spread.loc?.start ?? null, state, sourcemapTrace);
}

function createLocationDebugObject(
  t: typeof BabelTypes,
  locations: CompiledStyleObjectLocations,
  styleLoc: BabelTypes.SourceLocation['start'] | null,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
) {
  if (sourcemapTrace === 'style' && !styleLoc) return null;

  const properties: BabelTypes.ObjectExpression['properties'] = [];

  for (const [key, loc] of Object.entries(locations)) {
    const valueLoc = {
      line: loc.line,
      column: Math.max(loc.column - 1, 0),
    } as BabelTypes.SourceLocation['start'];
    const propertyLoc = sourcemapTrace === 'style' && styleLoc ? styleLoc : valueLoc;
    const property = t.objectProperty(t.stringLiteral(key), t.nullLiteral()) as DebugTraceProperty;

    property.loc = {
      start: propertyLoc,
      end: propertyLoc,
    } as BabelTypes.SourceLocation;

    if (styleLoc) {
      property.__styleSourcemapStyleLoc = styleLoc;
    }

    property.__styleSourcemapValueLoc = valueLoc;

    if (loc.filePath && loc.filePath !== state.filePath) {
      property.__styleSourcemapValueSourceUrl = getDebugSourceUrl(
        loc.filePath,
        loc.filePath,
        state.projectDir,
        state.options,
      );
    }

    properties.push(property);
  }

  return t.objectExpression(properties);
}

function createStyleDataDebugObject(
  t: typeof BabelTypes,
  items: readonly unknown[],
  styleLoc: BabelTypes.SourceLocation['start'] | null,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
) {
  if (sourcemapTrace === 'style' && !styleLoc) return null;

  const properties: BabelTypes.ObjectExpression['properties'] = [];

  for (const item of items) {
    if (Array.isArray(item) || !item || typeof item !== 'object') continue;

    const runtimeItem = item as RuntimeItem;
    const key = runtimeItem.property;
    const valueLoc = getRuntimeItemValueLoc(runtimeItem);
    if (!key || !valueLoc) continue;

    const propertyLoc = sourcemapTrace === 'style' && styleLoc
      ? styleLoc
      : debugLocToSourceLoc(valueLoc);
    const property = t.objectProperty(t.stringLiteral(key), t.nullLiteral()) as DebugTraceProperty;

    property.loc = {
      start: propertyLoc,
      end: propertyLoc,
    } as BabelTypes.SourceLocation;

    if (styleLoc) {
      property.__styleSourcemapStyleLoc = styleLoc;
    }

    property.__styleSourcemapValueLoc = debugLocToSourceLoc(valueLoc);
    property.__styleSourcemapValueSourceUrl = valueLoc[3] || runtimeItem.debug?.sourceUrl;

    properties.push(property);
  }

  return properties.length ? t.objectExpression(properties) : null;
}

function getRuntimeItemValueLoc(item: RuntimeItem): DebugLoc | null {
  if (item.debug && item.debugField) {
    const loc = item.debug.fields?.[item.debugField];
    if (Array.isArray(loc)) return withDebugSource(loc, item.debug.sourceUrl, item.debug.code);
    if (loc) {
      const valueLoc = loc[TRACE_VALUE] ?? loc[TRACE_STYLE] ?? null;
      return valueLoc ? withDebugSource(valueLoc, item.debug.sourceUrl, item.debug.code) : null;
    }
  }

  return item.callsite
    ? [item.callsite.line, item.callsite.column, undefined, item.callsite.sourceUrl, item.callsite.sourceContent]
    : null;
}

function withDebugSource(
  loc: DebugLoc,
  sourceUrl: string,
  sourceContent: string | undefined,
): DebugLoc {
  return loc[3] ? loc : [loc[0], loc[1], loc[2], sourceUrl, sourceContent];
}

function debugLocToSourceLoc(loc: DebugLoc) {
  return {
    line: loc[0],
    column: Math.max(loc[1] - 1, 0),
  } as BabelTypes.SourceLocation['start'];
}

function createSpreadDebugObject(
  t: typeof BabelTypes,
  source: BabelTypes.ObjectExpression,
  spread: BabelTypes.SpreadElement,
  sourcemapTrace: SourcemapTrace,
) {
  const loc = spread.loc?.start;
  return createTraceDebugObject(t, source, loc ?? null, sourcemapTrace);
}

function createTraceDebugObject(
  t: typeof BabelTypes,
  source: BabelTypes.ObjectExpression,
  loc: BabelTypes.SourceLocation['start'] | null,
  sourcemapTrace: SourcemapTrace,
) {
  if (sourcemapTrace === 'style' && !loc) return null;

  const properties: BabelTypes.ObjectExpression['properties'] = [];

  for (const property of source.properties) {
    if (property.type === 'SpreadElement') continue;
    if (property.type !== 'ObjectProperty') continue;
    if (property.computed) continue;

    const clone = t.cloneNode(property);
    const sourceProperty = property as DebugTraceProperty;
    const clonedProperty = clone as DebugTraceProperty;
    clonedProperty.__styleSourcemapStyleLoc = sourceProperty.__styleSourcemapStyleLoc;
    clonedProperty.__styleSourcemapStyleSourceUrl = sourceProperty.__styleSourcemapStyleSourceUrl;
    clonedProperty.__styleSourcemapValueLoc = sourceProperty.__styleSourcemapValueLoc;
    clonedProperty.__styleSourcemapValueSourceUrl = sourceProperty.__styleSourcemapValueSourceUrl;

    if (loc && !clonedProperty.__styleSourcemapStyleLoc) {
      clonedProperty.__styleSourcemapStyleLoc = loc;
    }
    if (!clonedProperty.__styleSourcemapValueLoc) {
      clonedProperty.__styleSourcemapValueLoc = property.loc?.start;
    }

    if (sourcemapTrace === 'style' && loc) {
      clone.loc = {
        ...property.loc,
        start: loc,
      } as BabelTypes.SourceLocation;
    }
    properties.push(clone);
  }

  return t.objectExpression(properties);
}

function isStyleUtilityCall(
  callee: BabelTypes.CallExpression['callee'],
  styleNames: Set<string>,
) {
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.object.type !== 'Identifier' || !styleNames.has(callee.object.name)) return false;
  if (callee.property.type !== 'Identifier') return false;

  return callee.property.name === FN_STYLE_RAW ||
    callee.property.name === FN_STYLE_PLAIN ||
    callee.property.name === FN_STYLE_KEYFRAMES ||
    callee.property.name === FN_STYLE_MERGE;
}

function isScopeItemCall(
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
) {
  if (!isScopeItemValueCall(path.node, state.styleNames)) return false;

  if (isInsideScopeCallArg(path, state.styleNames)) return true;

  const declarator = getEnclosingVariableDeclarator(path);
  if (!declarator || declarator.node.id.type !== 'Identifier') return false;

  if (isExportedVariableDeclarator(declarator)) return true;
  if (isExportedBindingName(declarator, declarator.node.id.name)) return true;

  const binding = declarator.scope.getBinding(declarator.node.id.name);
  if (!binding) return false;

  return isBindingUsedInScopeArg(binding, state.styleNames, new Set());
}

function isScopeItemValueCall(
  node: BabelTypes.CallExpression,
  styleNames: Set<string>,
) {
  if (isStyleChainCall(node.callee, styleNames)) return true;

  return node.callee.type === 'MemberExpression' ||
    node.callee.type === 'Identifier';
}

function isInsideScopeCallArg(
  path: NodePath<BabelTypes.CallExpression>,
  styleNames: Set<string>,
) {
  let current: NodePath | null = path.parentPath;

  while (current) {
    if (current.isCallExpression() && isScopeChainCall(current.node.callee, styleNames)) {
      return isDescendantOfCallArgument(path, current);
    }

    if (current.isStatement()) return false;

    current = current.parentPath;
  }

  return false;
}

function isBindingUsedInScopeArg(
  binding: BabelBinding,
  styleNames: Set<string>,
  seen: Set<string>,
): boolean {
  if (seen.has(binding.identifier.name)) return false;
  seen.add(binding.identifier.name);

  return binding.referencePaths.some((referencePath) => {
    if (isReferenceInsideScopeArg(referencePath, styleNames)) return true;

    const declarator = getEnclosingVariableDeclarator(referencePath);
    if (!declarator || declarator.node.id.type !== 'Identifier') return false;

    const nextBinding = declarator.scope.getBinding(declarator.node.id.name);
    return nextBinding
      ? isBindingUsedInScopeArg(nextBinding, styleNames, seen)
      : false;
  });
}

function isReferenceInsideScopeArg(
  path: NodePath,
  styleNames: Set<string>,
) {
  let current: NodePath | null = path.parentPath;

  while (current) {
    if (current.isCallExpression() && isScopeChainCall(current.node.callee, styleNames)) {
      return isDescendantOfCallArgument(path, current);
    }

    if (current.isStatement()) return false;

    current = current.parentPath;
  }

  return false;
}

function isDescendantOfCallArgument(
  child: NodePath,
  parent: NodePath<BabelTypes.CallExpression>,
) {
  let current: NodePath | null = child;
  let previous: NodePath | null = null;

  while (current && current !== parent) {
    previous = current;
    current = current.parentPath;
  }

  if (current !== parent || !previous) return false;

  return parent.get('arguments').some((argPath) => argPath === previous);
}

function getEnclosingVariableDeclarator(
  path: NodePath,
) {
  let current: NodePath | null = path;

  while (current && !current.isStatement()) {
    if (current.isVariableDeclarator()) return current;
    current = current.parentPath;
  }

  return null;
}

function isExportedVariableDeclarator(
  declarator: NodePath<BabelTypes.VariableDeclarator>,
) {
  const declaration = declarator.parentPath;
  return declaration?.isVariableDeclaration() &&
    declaration.parentPath?.isExportNamedDeclaration();
}

function isExportedBindingName(
  declarator: NodePath<BabelTypes.VariableDeclarator>,
  name: string,
) {
  const program = declarator.findParent((parent) => parent.isProgram());
  if (!program?.isProgram()) return false;

  return program.node.body.some((statement) => {
    if (statement.type !== 'ExportNamedDeclaration' || statement.source) return false;

    return statement.specifiers.some((specifier) => {
      return specifier.type === 'ExportSpecifier' &&
        specifier.local.type === 'Identifier' &&
        specifier.local.name === name;
    });
  });
}

function isScopeChainCall(
  callee: BabelTypes.CallExpression['callee'],
  styleNames: Set<string>,
): boolean {
  if (callee.type !== 'MemberExpression' || callee.computed) return false;

  const object = callee.object;
  const property = callee.property;

  if (
    object.type === 'Identifier' &&
    styleNames.has(object.name) &&
    property.type === 'Identifier' &&
    property.name === FN_STYLE_SCOPE
  ) {
    return true;
  }

  if (object.type === 'CallExpression') {
    return isScopeChainCall(object.callee, styleNames);
  }

  if (object.type === 'MemberExpression') {
    return isScopeChainCall(object, styleNames);
  }

  return false;
}

function getSourceUrlId(
  t: typeof BabelTypes,
  state: PluginState,
) {
  if (state.sourceUrlId) return t.cloneNode(state.sourceUrlId);
  if (!state.programPath) return t.stringLiteral('');

  state.sourceUrlId = state.programPath.scope.generateUidIdentifier(DEBUG_SOURCE_URL_VAR);

  return t.cloneNode(state.sourceUrlId);
}

function getSourceContentId(
  t: typeof BabelTypes,
  state: PluginState,
) {
  if (state.sourceContentId) return t.cloneNode(state.sourceContentId);
  if (!state.programPath) return null;

  state.sourceContentId = state.programPath.scope.generateUidIdentifier(DEBUG_SOURCE_CONTENT_VAR);

  return t.cloneNode(state.sourceContentId);
}

function insertDebugDeclarations(
  t: typeof BabelTypes,
  programPath: NodePath<BabelTypes.Program>,
  state: PluginState,
  sourceUrl: string,
  sourceContent: string | null,
) {
  const declarations: BabelTypes.Statement[] = [];

  if (state.sourceUrlId) {
    declarations.push(createDebugSourceDeclaration(
      t,
      state.sourceUrlId,
      sourceUrl,
      state.sourceContentId,
      sourceContent,
    ));
  }

  if (!declarations.length) return;

  const bodyPaths = programPath.get('body');
  const insertAt = getSourceContentInsertIndex(bodyPaths);

  if (insertAt >= bodyPaths.length) {
    programPath.pushContainer('body', declarations);
  } else {
    bodyPaths[insertAt].insertBefore(declarations);
  }
}

function createDebugSourceDeclaration(
  t: typeof BabelTypes,
  sourceUrlId: BabelTypes.Identifier,
  sourceUrl: string,
  sourceContentId: BabelTypes.Identifier | null,
  sourceContent: string | null,
) {
  const declarators = [
    t.variableDeclarator(
      t.cloneNode(sourceUrlId),
      t.stringLiteral(sourceUrl),
    ),
  ];

  if (sourceContentId && sourceContent) {
    declarators.push(
      t.variableDeclarator(
        t.cloneNode(sourceContentId),
        t.stringLiteral(sourceContent),
      ),
    );
  }

  return t.variableDeclaration('const', declarators);
}

function getSourceContentInsertIndex(
  bodyPaths: NodePath<BabelTypes.Statement>[],
) {
  let index = 0;

  for (; index < bodyPaths.length; index++) {
    const node = bodyPaths[index].node;
    if (!isDirectiveStatement(node) && node.type !== 'ImportDeclaration') break;
  }

  return index;
}

function isDirectiveStatement(node: BabelTypes.Statement) {
  return node.type === 'ExpressionStatement' &&
    node.expression.type === 'StringLiteral' &&
    typeof (node as BabelTypes.ExpressionStatement & { directive?: string; }).directive === 'string';
}
