import * as BabelCore from '@babel/core';
import type { CompilerOptions } from '../../compiler/types';
import type { CompilerCssCollector } from '../../extract/collector';
import { FN_CREATE_EXTRACTED_THEME, IMPORT_EXTRACT } from '../../utils/constants';
import { createImportSourceMatcher } from '../../utils/import_source';
import { evaluateNode } from '../evaluator';
import type { Tracer } from '../evaluator';
import { getImportedName } from '../syntax';
import { babelPlugin } from '../utils/babel';
import { getProjectFileId } from '../utils/path';
import { compileChain, extractStyleChain } from './chain';
import { pruneUnusedStyleImports } from './utils/imports';
import { buildReplacement } from './utils/replacement';
import { recordCompiledSlotBinding } from './utils/slot';
import { type ExtractPluginState, getEvalScope } from './utils/state';
import { compileThemeCall } from './utils/theme';
import { annotateTokenDeclaration } from './utils/token';

export type PluginState = BabelCore.PluginPass & ExtractPluginState;

type PluginArgs = {
  options: CompilerOptions;
  collector: CompilerCssCollector;
  mode?: 'extract' | 'collect';
  projectDir: string;
  styleFilePath?: string;
  tracer: Tracer;
};

export function createExtractPlugin(args: PluginArgs) {
  const { options } = args;
  const mode = args.mode ?? 'extract';

  return babelPlugin<PluginState>((babel) => {
    const { types: t } = babel;

    return {
      pre(this) {
        this.styleNames = new Set();
        this.bindings = new Map();
        this.imports = new Map();
        this.needsExtractImport = false;
        this.usedHelpers = new Set<string>();
        this.importSourceMatcher = createImportSourceMatcher(options.importSources ?? null);
        this.resolveImport = (source, fromFile) => args.tracer.resolveImport(babel, source, fromFile);
        this.collector = args.collector;
        this.filePath = this.file?.opts?.filename ?? 'unknown';
        this.styleFilePath = args.styleFilePath ?? this.filePath;
        this.fileId = args.styleFilePath ?? getProjectFileId(args.projectDir, this.file?.opts?.filename);
      },

      visitor: {
        ImportDeclaration(path, state) {
          const source = path.node.source.value;

          path.node.specifiers.forEach((spec) => {
            if (spec.type === 'ImportSpecifier') {
              const imported = getImportedName(spec);
              state.imports.set(spec.local.name, { source, name: imported });
            } else if (spec.type === 'ImportDefaultSpecifier') {
              state.imports.set(spec.local.name, { source, name: 'default' });
            }
          });

          const sourceName = typeof source === 'string' ? source : null;
          if (!sourceName) return;

          path.node.specifiers.forEach((spec) => {
            if (spec.type !== 'ImportSpecifier' && spec.type !== 'ImportDefaultSpecifier') return;

            const imported = spec.type === 'ImportSpecifier'
              ? getImportedName(spec)
              : 'default';

            if (state.importSourceMatcher({ source: sourceName, name: imported })) {
              state.styleNames.add(spec.local.name);
            }
          });
        },

        VariableDeclaration(path, state) {
          if (path.parentPath?.isExportNamedDeclaration()) return;

          path.node.declarations.forEach((decl) => {
            if (decl.id.type !== 'Identifier' || !decl.init) return;

            annotateTokenDeclaration(decl, state, t);

            const name = decl.id.name;
            const scope = getEvalScope(state);
            const result = evaluateNode(decl.init, scope);

            state.bindings.set(name, result);
          });
        },

        ExportNamedDeclaration(path, state) {
          if (!path.node.declaration) return;
          if (path.node.declaration.type !== 'VariableDeclaration') return;

          path.node.declaration.declarations.forEach((decl) => {
            if (decl.id.type !== 'Identifier' || !decl.init) return;

            annotateTokenDeclaration(decl, state, t);

            const name = decl.id.name;
            const scope = getEvalScope(state);
            const result = evaluateNode(decl.init, scope);

            state.bindings.set(name, result);
          });
        },

        CallExpression(path, state) {
          if (
            path.parent.type === 'MemberExpression' &&
            !(path.parent.computed)
          ) {
            return;
          }

          const theme = compileThemeCall(path, state, options);

          if (theme) {
            state.collector.add(theme.rule);

            if (mode === 'collect') {
              return;
            }

            state.usedHelpers.add(FN_CREATE_EXTRACTED_THEME);

            path.replaceWith(t.callExpression(
              t.identifier(FN_CREATE_EXTRACTED_THEME),
              [t.stringLiteral(theme.id), t.stringLiteral(theme.className)],
            ));

            path.skip();
            state.needsExtractImport = true;

            return;
          }

          if (!state.styleNames.size) return;

          const chain = extractStyleChain(path.node, state.styleNames);
          if (!chain) return;

          if (
            chain.kind === 'slot' &&
            path.parent.type === 'CallExpression' &&
            path.parent.callee === path.node
          ) {
            throw path.buildCodeFrameError(
              'Direct invocation `style.slot(...)()` is not allowed. Assign the slot to a variable first, then call it through that binding.',
            );
          }

          const scope = getEvalScope(state);
          const loc = path.node.loc?.start;

          const result = compileChain(chain, state.fileId, loc, scope, options);
          if (!result) return;

          result.rules.forEach((rule) => {
            state.collector.add(rule);
          });

          if (mode === 'collect') {
            return;
          }

          const replacement = buildReplacement(t, result, state);
          if (!replacement) return;

          recordCompiledSlotBinding(path, state, result);

          path.replaceWith(replacement);
          path.skip();

          state.needsExtractImport = true;
        },

        Program: {
          exit(path, state) {
            if (mode === 'collect') return;

            pruneUnusedStyleImports(path, state);

            if (!state.needsExtractImport) return;

            const helpers = [...state.usedHelpers];
            if (!helpers.length) return;

            const importDecl = t.importDeclaration(
              helpers.map((helper) => t.importSpecifier(t.identifier(helper), t.identifier(helper))),
              t.stringLiteral(IMPORT_EXTRACT),
            );

            path.unshiftContainer('body', importDecl);
          },
        },
      },
    };
  });
}
