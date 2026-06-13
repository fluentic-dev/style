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
import { buildDebugDataObject, hasDebugArgument } from './utils/debug_data';

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
          if (!isStyleChainCall(path.node.callee, state.styleNames)) return;
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
            ),
          );
        },
      },
    };
  });
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
