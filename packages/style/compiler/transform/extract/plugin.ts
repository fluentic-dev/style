import { BabelCore } from '../utils/babel';
import type { BabelTypes } from '../utils/babel';
import { hashString } from '../../../utils/hash';
import type { CompilerOptions } from '../../compiler/types';
import type { CompilerCssCollector } from '../../extract/collector';
import {
  FN_STYLE_PLAIN,
  FN_STYLE_RAW,
  FN_CREATE_EXTRACTED_THEME,
  FN_CREATE_EXTRACTED_TOKEN,
  FN_WITH_TOKENS,
  IMPORT_EXTRACT,
} from '../../utils/constants';
import { createImportSourceMatcher } from '../../utils/import_source';
import { normalizePath } from '../../utils/path';
import { evaluateNode } from '../evaluator/evaluator';
import { getImportedName } from '../syntax';
import { annotateAtRuleDeclaration } from '../syntax/static_ids';
import { babelPlugin } from '../utils/babel';
import { getSelectorCompileErrorNode } from '../utils/selector';
import { compileChain, extractStyleChain } from './chain';
import { pruneUnusedStyleImports } from './utils/imports';
import { buildReplacement } from './utils/replacement';
import { recordCompiledBinding } from './utils/slot';
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
  tracer: ExtractTracer;
};

export type ExtractTracer = {
  resolveImport(
    babel: typeof BabelCore,
    source: string,
    fromFile: string,
  ): ReturnType<ExtractPluginState['resolveImport']>;
};

export function createExtractPlugin(args: PluginArgs) {
  const { options } = args;
  const mode = args.mode ?? 'extract';

  return babelPlugin<PluginState>((babel) => {
    const { types: t } = babel;

    return {
      pre(this) {
        this.styleNames = new Set();
        this.styleMetas = new Map();
        this.bindings = new Map();
        this.imports = new Map();
        this.needsExtractImport = false;
        this.usedHelpers = new Set<string>();
        this.hoistedDeclarations = [];
        this.runtimeTokenIndex = 0;
        this.options = options;
        this.importSourceMatcher = createImportSourceMatcher(options.importSources ?? null);
        this.resolveImport = (source, fromFile) => args.tracer.resolveImport(babel, source, fromFile);
        this.collector = args.collector;
        this.filePath = this.file?.opts?.filename ?? 'unknown';
        this.styleFilePath = args.styleFilePath ?? this.filePath;
        this.sourcemapTrace = options.dev?.sourcemapMode ?? 'style';
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

            const meta = state.importSourceMatcher({ source: sourceName, name: imported });
            if (meta) {
              state.styleNames.add(spec.local.name);
              state.styleMetas.set(spec.local.name, meta);
            }
          });
        },

        VariableDeclaration(path, state) {
          if (path.parentPath?.isExportNamedDeclaration()) return;

          path.node.declarations.forEach((decl) => {
            if (decl.id.type !== 'Identifier' || !decl.init) return;

            annotateTokenDeclaration(decl, state, t);
            annotateAtRuleDeclaration(decl, state, t);

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
            annotateAtRuleDeclaration(decl, state, t);

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
          const meta = state.styleMetas.get(chain.rootName);
          if (!meta) return;

          let result: ReturnType<typeof compileChain>;
          try {
            result = compileChain(chain, state.fileId, loc, scope, options, meta, state.styleNames);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const node = getSelectorCompileErrorNode(error);
            throw buildCodeFrameError(path, node ?? path.node, message);
          }
          if (!result) return;

          result.rules.forEach((rule) => {
            state.collector.add(rule);
          });

          if (mode === 'collect') {
            return;
          }

          const replacement = createChainReplacement({
            t,
            path,
            state,
            result,
            hoist: options.hoist !== false,
          });
          if (!replacement) return;

          recordCompiledBinding(path, state, result);

          if (!replacement.hoist) {
            path.replaceWith(replacement.expression);
            path.skip();
            state.needsExtractImport = true;
            return;
          }

          path.replaceWith(replacement.expression);
          path.skip();

          state.needsExtractImport = true;
        },

        Program: {
          exit(path, state) {
            if (mode === 'collect') return;

            pruneUnusedStyleInputDeclarations(path, state);
            pruneUnusedStyleImports(path, state);

            if (!state.needsExtractImport) return;

            const helpers = [...state.usedHelpers];
            if (!helpers.length) return;

            const importDecl = t.importDeclaration(
              helpers.map((helper) => t.importSpecifier(t.identifier(helper), t.identifier(helper))),
              t.stringLiteral(IMPORT_EXTRACT),
            );

            path.unshiftContainer('body', importDecl);
            insertHoistedDeclarations(path, state.hoistedDeclarations);
          },
        },
      },
    };
  });
}

function pruneUnusedStyleInputDeclarations(
  path: BabelCore.NodePath<BabelTypes.Program>,
  state: PluginState,
) {
  path.scope.crawl();

  path.traverse({
    VariableDeclarator(declaratorPath) {
      const node = declaratorPath.node;

      if (declaratorPath.parentPath?.parentPath?.isExportNamedDeclaration()) return;
      if (node.id.type !== 'Identifier') return;
      if (!isStyleInputCall(node.init, state)) return;

      const binding = declaratorPath.scope.getBinding(node.id.name);
      if (!binding || binding.referencePaths.length) return;

      const declarationPath = declaratorPath.parentPath;
      if (!declarationPath?.isVariableDeclaration()) return;

      if (declarationPath.node.declarations.length > 1) {
        declaratorPath.remove();
      } else {
        declarationPath.remove();
      }
    },
  });

  path.scope.crawl();
}

function isStyleInputCall(
  node: BabelTypes.Node | null | undefined,
  state: PluginState,
) {
  if (!node || node.type !== 'CallExpression') return false;

  const callee = node.callee;
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.object.type !== 'Identifier') return false;
  if (!state.styleNames.has(callee.object.name)) return false;

  const property = callee.property;
  if (property.type !== 'Identifier') return false;

  return property.name === FN_STYLE_RAW || property.name === FN_STYLE_PLAIN;
}

function buildCodeFrameError(
  path: BabelCore.NodePath<BabelTypes.Node>,
  node: BabelTypes.Node,
  message: string,
) {
  const hub = path.hub as unknown as {
    buildError: (node: BabelTypes.Node, message: string, ErrorCtor: ErrorConstructor) => Error;
  };

  return hub.buildError(node, message, Error);
}

function getProjectFileId(projectDir: string, filePath: string | null | undefined) {
  if (!filePath) return 'unknown';

  const normalizedProjectDir = normalizePath(projectDir).replace(/\/+$/, '');
  const normalizedFilePath = normalizePath(filePath);
  const prefix = normalizedProjectDir + '/';

  if (normalizedProjectDir && normalizedFilePath.startsWith(prefix)) {
    return normalizedFilePath.slice(prefix.length);
  }

  return normalizedFilePath;
}

type ChainReplacementArgs = {
  t: typeof BabelTypes;
  path: BabelCore.NodePath<BabelTypes.CallExpression>;
  state: ExtractPluginState;
  result: Parameters<typeof buildReplacement>[1];
  hoist: boolean;
};

type ChainReplacement = {
  expression: BabelTypes.Expression;
  hoist: boolean;
};

function createChainReplacement(
  args: ChainReplacementArgs,
): ChainReplacement | null {
  if (!args.hoist) {
    const expression = buildReplacement(args.t, args.result, args.state);
    return expression ? { expression, hoist: false } : null;
  }

  const runtimeTokens = createRuntimeTokenCollector(args);
  const hoistedExpression = buildReplacement(args.t, args.result, args.state, {
    getRuntimeToken: runtimeTokens.add,
    getTokenOverride: runtimeTokens.addOverride,
  });

  if (!hoistedExpression) return null;

  const hoisted = args.path.scope.generateUidIdentifier('fluenticStyle');
  args.state.hoistedDeclarations.push(args.t.variableDeclaration('const', [
    args.t.variableDeclarator(hoisted, hoistedExpression),
  ]));

  if (!runtimeTokens.overrides.length) {
    return {
      expression: args.t.cloneNode(hoisted),
      hoist: true,
    };
  }

  args.state.usedHelpers.add(FN_WITH_TOKENS);

  return {
    expression: args.t.callExpression(args.t.identifier(FN_WITH_TOKENS), [
      args.t.cloneNode(hoisted),
      args.t.arrayExpression(runtimeTokens.overrides),
    ]),
    hoist: true,
  };
}

function createRuntimeTokenCollector(
  args: ChainReplacementArgs,
) {
  const tokensByItem = new WeakMap<object, BabelTypes.Identifier>();
  const overrides: BabelTypes.Expression[] = [];

  return {
    overrides,
    addOverride(item: { valueNode: BabelTypes.Expression; }) {
      overrides.push(args.t.cloneNode(item.valueNode));
    },
    add(item: object, valueNode: BabelTypes.Expression) {
      const token = getRuntimeTokenIdentifier(args, tokensByItem, item);

      overrides.push(
        args.t.callExpression(args.t.cloneNode(token), [args.t.cloneNode(valueNode)]),
      );

      return args.t.cloneNode(token);
    },
  };
}

function getRuntimeTokenIdentifier(
  args: ChainReplacementArgs,
  tokensByItem: WeakMap<object, BabelTypes.Identifier>,
  item: object,
) {
  const existing = tokensByItem.get(item);
  if (existing) return existing;

  const token = args.path.scope.generateUidIdentifier('fluenticToken');
  const tokenIndex = args.state.runtimeTokenIndex++;
  const tokenId = hashString(`${args.state.fileId}\nruntime:${tokenIndex}`);

  tokensByItem.set(item, token);
  args.state.usedHelpers.add(FN_CREATE_EXTRACTED_TOKEN);
  args.state.hoistedDeclarations.push(args.t.variableDeclaration('const', [
    args.t.variableDeclarator(
      token,
      args.t.callExpression(args.t.identifier(FN_CREATE_EXTRACTED_TOKEN), [
        args.t.stringLiteral(tokenId),
        args.t.nullLiteral(),
      ]),
    ),
  ]));

  return token;
}

function insertHoistedDeclarations(
  path: BabelCore.NodePath<BabelTypes.Program>,
  declarations: BabelTypes.Statement[],
) {
  if (!declarations.length) return;

  const body = path.node.body;
  let index = 0;

  while (index < body.length && body[index].type === 'ImportDeclaration') {
    index++;
  }

  body.splice(index, 0, ...declarations);
}
