import type * as BabelCore from '@babel/core';
import type { NodePath, types as BabelTypes } from '@babel/core';
import type { CompilerOptions } from '../../compiler/types';
import { DEBUG_SOURCE_CONTENT_VAR, DEBUG_SOURCE_URL_VAR, DEFAULT_CONFIG } from '../../utils/constants';
import { createImportSourceMatcher, type ImportSourceMatcher } from '../../utils/import_source';
import {
  annotateThemeCall,
  annotateTokenDeclaration,
  getImportedName,
  isStyleChainCall,
  type StaticIdImport,
} from '../syntax';
import { babelPlugin } from '../utils/babel';
import { getProjectFileId } from '../utils/path';
import { buildDebugDataObject, hasDebugArgument, type DebugTraceProperty } from './utils/debug_data';

type PluginState = BabelCore.PluginPass & {
  styleNames: Set<string>;
  imports: Map<string, StaticIdImport>;
  importSourceMatcher: ImportSourceMatcher;
  fileId: string;
  programPath: NodePath<BabelTypes.Program> | null;
  sourceUrlId: BabelTypes.Identifier | null;
  sourceContentId: BabelTypes.Identifier | null;
};

type PluginArgs = {
  options: CompilerOptions;
  projectDir: string;
  sourceUrl: string;
  sourceContent: string | null;
};

type SourcemapTrace = NonNullable<CompilerOptions['sourcemapTrace']>;

type BabelBinding = {
  identifier: BabelTypes.Identifier;
  referencePaths: NodePath[];
};

export function createDebugPlugin(args: PluginArgs) {
  const { options, projectDir, sourceUrl, sourceContent } = args;

  return babelPlugin<PluginState>(({ types: t }) => {
    return {
      pre(this: PluginState) {
        this.styleNames = new Set();
        this.imports = new Map();
        this.importSourceMatcher = createImportSourceMatcher(options.importSources ?? null);
        this.fileId = getProjectFileId(projectDir, this.file?.opts?.filename);
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
            if (!state.sourceUrlId) return;

            insertDebugSourceDeclaration(
              t,
              path,
              state.sourceUrlId,
              sourceUrl,
              state.sourceContentId,
              sourceContent,
            );
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

            if (state.importSourceMatcher({ source, name: imported })) {
              state.styleNames.add(spec.local.name);
            }
          });
        },

        VariableDeclaration(path, state) {
          path.node.declarations.forEach((decl) => {
            annotateTokenDeclaration(decl, state, t);
          });
        },

        CallExpression(
          path: NodePath<BabelTypes.CallExpression>,
          state: PluginState,
        ) {
          annotateThemeCall(path.node, state, t);

          if (!state.styleNames.size) return;
          if (isRawPlainCall(path.node.callee, state.styleNames)) return;
          if (
            isScopeChainCall(path.node.callee, state.styleNames) ||
            (
              !isStyleChainCall(path.node.callee, state.styleNames) &&
              !isScopeItemCall(path, state)
            )
          ) return;
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
              options.css?.tokenVarPrefix ?? DEFAULT_CONFIG.tokenVarPrefix,
              getDebugStyleArg(t, path, state, options.sourcemapTrace ?? 'style'),
            ),
          );
        },
      },
    };
  });
}

function getDebugStyleArg(
  t: typeof BabelTypes,
  path: NodePath<BabelTypes.CallExpression>,
  state: PluginState,
  sourcemapTrace: SourcemapTrace,
) {
  const arg = path.node.arguments[0];
  if (!arg || arg.type !== 'ObjectExpression') return arg;

  return flattenDebugObjectExpression(
    t,
    arg,
    path,
    state,
    sourcemapTrace,
    new Set(),
  );
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

  if (!init) return null;

  seen.add(node.name);

  try {
    if (init.type === 'ObjectExpression') {
      return createSpreadDebugObject(t, init, spread, sourcemapTrace);
    }

    if (
      init.type === 'CallExpression' &&
      isRawPlainCall(init.callee, state.styleNames) &&
      init.arguments[0]?.type === 'ObjectExpression'
    ) {
      return createSpreadDebugObject(t, init.arguments[0], spread, sourcemapTrace);
    }

    return null;
  } finally {
    seen.delete(node.name);
  }
}

function createSpreadDebugObject(
  t: typeof BabelTypes,
  source: BabelTypes.ObjectExpression,
  spread: BabelTypes.SpreadElement,
  sourcemapTrace: SourcemapTrace,
) {
  const loc = spread.loc?.start;
  if (sourcemapTrace === 'style' && !loc) return null;

  const properties: BabelTypes.ObjectExpression['properties'] = [];

  for (const property of source.properties) {
    if (property.type === 'SpreadElement') continue;
    if (property.type !== 'ObjectProperty') continue;
    if (property.computed) continue;

    const clone = t.cloneNode(property);
    (clone as DebugTraceProperty).__styleSourcemapStyleLoc = loc;
    (clone as DebugTraceProperty).__styleSourcemapValueLoc = property.loc?.start;

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

function isRawPlainCall(
  callee: BabelTypes.CallExpression['callee'],
  styleNames: Set<string>,
) {
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.object.type !== 'Identifier' || !styleNames.has(callee.object.name)) return false;
  if (callee.property.type !== 'Identifier') return false;

  return callee.property.name === 'raw' || callee.property.name === 'plain';
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
    property.name === 'scope'
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

function insertDebugSourceDeclaration(
  t: typeof BabelTypes,
  programPath: NodePath<BabelTypes.Program>,
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

  const declaration = t.variableDeclaration('const', declarators);
  const bodyPaths = programPath.get('body');
  const insertAt = getSourceContentInsertIndex(bodyPaths);

  if (insertAt >= bodyPaths.length) {
    programPath.pushContainer('body', declaration);
  } else {
    bodyPaths[insertAt].insertBefore(declaration);
  }
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
