import { hashString } from '../../../utils/hash';
import type { CompilerRuntimeMode } from '../../compiler';
import type { CompilerOptions } from '../../compiler/types';
import type { CompilerCssCollector } from '../../extract/collector';
import {
  FN_CREATE_EXTRACTED_THEME,
  FN_CREATE_EXTRACTED_TOKEN,
  FN_STYLE_PLAIN,
  FN_STYLE_RAW,
  FN_WITH_TOKENS,
  IMPORT_EXTRACT,
} from '../../utils/constants';
import { createImportSourceMatcher } from '../../utils/import_source';
import { normalizePath } from '../../utils/path';
import { evaluateEnumDeclaration, evaluateNode } from '../evaluator/evaluator';
import { getImportedName } from '../syntax';
import { annotateAtRuleDeclaration } from '../syntax/static_ids';
import { BabelCore } from '../utils/babel';
import type { BabelTypes } from '../utils/babel';
import { babelPlugin } from '../utils/babel';
import { getSelectorCompileErrorNode } from '../utils/selector';
import { compileChain, extractStyleChain } from './chain';
import { pruneUnusedStyleImports } from './utils/imports';
import { buildReplacement } from './utils/replacement';
import { recordCompiledBinding } from './utils/slot';
import { type ExtractPluginState, getEvalScope, type HoistedDeclaration } from './utils/state';
import { compileThemeCall } from './utils/theme';
import { annotateTokenDeclaration } from './utils/token';

export type PluginState = BabelCore.PluginPass & ExtractPluginState;

type PluginArgs = {
  options: CompilerOptions;
  collector: CompilerCssCollector;
  mode?: 'extract' | 'collect';
  projectDir: string;
  runtimeMode: CompilerRuntimeMode | null;
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
        this.bindingNodes = new Map();
        this.imports = new Map();
        this.needsExtractImport = false;
        this.usedHelpers = new Set<string>();
        this.hoistedDeclarations = [];
        this.runtimeTokenIndex = 0;
        this.runtimeMode = args.runtimeMode;
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
            state.bindingNodes.set(name, decl.init);
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
            state.bindingNodes.set(name, decl.init);
          });
        },

        TSEnumDeclaration(path, state) {
          const name = path.node.id.name;
          const scope = getEvalScope(state);
          state.bindings.set(name, evaluateEnumDeclaration(path.node, scope));
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
  if (!args.hoist || !shouldHoistReplacement(args.path)) {
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
  args.state.hoistedDeclarations.push({
    declaration: args.t.variableDeclaration('const', [
      args.t.variableDeclarator(hoisted, hoistedExpression),
    ]),
    dependencies: collectHoistDependencies(args.path, [args.path.node, hoistedExpression]),
  });

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

function shouldHoistReplacement(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
): boolean {
  return !!path.getFunctionParent();
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
      if (canHoistRuntimeValue(args.path, valueNode)) {
        return null;
      }

      const token = getRuntimeTokenIdentifier(args, tokensByItem, item);

      overrides.push(
        args.t.callExpression(args.t.cloneNode(token), [args.t.cloneNode(valueNode)]),
      );

      return args.t.cloneNode(token);
    },
  };
}

function canHoistRuntimeValue(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  valueNode: BabelTypes.Expression,
): boolean {
  return isHoistSafeRuntimeValueNode(path, valueNode);
}

function isHoistSafeRuntimeValueNode(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  node: BabelTypes.Node | null | undefined,
): boolean {
  if (!node) return false;

  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
      return true;

    case 'Identifier':
      return isImportBinding(path, node.name) || isProgramBinding(path, node.name);

    case 'BinaryExpression':
    case 'LogicalExpression':
      return isHoistSafeRuntimeValueNode(path, node.left) &&
        isHoistSafeRuntimeValueNode(path, node.right);

    case 'TemplateLiteral':
      return node.expressions.every((expr) => isHoistSafeRuntimeValueNode(path, expr as BabelTypes.Node));

    case 'MemberExpression':
      return isHoistSafeRuntimeValueNode(path, node.object) &&
        (!node.computed || isHoistSafeRuntimeValueNode(path, node.property));

    case 'ConditionalExpression':
      return isHoistSafeRuntimeValueNode(path, node.test) &&
        isHoistSafeRuntimeValueNode(path, node.consequent) &&
        isHoistSafeRuntimeValueNode(path, node.alternate);

    case 'UnaryExpression':
      return isHoistSafeRuntimeValueNode(path, node.argument);

    case 'ParenthesizedExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
      return isHoistSafeRuntimeValueNode(path, (node as any).expression);

    default:
      return false;
  }
}

function isImportBinding(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  name: string,
): boolean {
  const binding = path.scope.getBinding(name);
  if (!binding) return false;

  return binding.path.isImportSpecifier() ||
    binding.path.isImportDefaultSpecifier() ||
    binding.path.isImportNamespaceSpecifier();
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
  args.state.hoistedDeclarations.push({
    declaration: args.t.variableDeclaration('const', [
      args.t.variableDeclarator(
        token,
        args.t.callExpression(args.t.identifier(FN_CREATE_EXTRACTED_TOKEN), [
          args.t.stringLiteral(tokenId),
          args.t.nullLiteral(),
        ]),
      ),
    ]),
    dependencies: new Set(),
  });

  return token;
}

function collectHoistDependencies(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  nodes: BabelTypes.Node[],
): Set<string> {
  const dependencies = new Set<string>();

  nodes.forEach((node) => {
    collectProgramBindingIdentifiers(path, node, dependencies);
  });

  return dependencies;
}

function collectProgramBindingIdentifiers(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  node: BabelTypes.Node | null | undefined,
  dependencies: Set<string>,
) {
  if (!node) return;

  if (node.type === 'Identifier') {
    if (isProgramBinding(path, node.name)) dependencies.add(node.name);
    return;
  }

  if (node.type === 'MemberExpression') {
    collectProgramBindingIdentifiers(path, node.object, dependencies);
    if (node.computed) collectProgramBindingIdentifiers(path, node.property, dependencies);
    return;
  }

  const visitorKeys = BabelCore.types.VISITOR_KEYS[node.type] ?? [];
  visitorKeys.forEach((key) => {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      child.forEach((item) => collectProgramBindingIdentifiers(path, item as BabelTypes.Node, dependencies));
    } else {
      collectProgramBindingIdentifiers(path, child as BabelTypes.Node, dependencies);
    }
  });
}

function isProgramBinding(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  name: string,
): boolean {
  const binding = path.scope.getBinding(name);
  return binding?.scope.block.type === 'Program' &&
    !binding.path.isImportSpecifier() &&
    !binding.path.isImportDefaultSpecifier() &&
    !binding.path.isImportNamespaceSpecifier();
}

function insertHoistedDeclarations(
  path: BabelCore.NodePath<BabelTypes.Program>,
  declarations: HoistedDeclaration[],
) {
  if (!declarations.length) return;

  const body = path.node.body;
  let firstRuntimeIndex = 0;

  while (firstRuntimeIndex < body.length && body[firstRuntimeIndex].type === 'ImportDeclaration') {
    firstRuntimeIndex++;
  }

  let runtimeInsertIndex = firstRuntimeIndex;

  declarations.forEach((item) => {
    let insertIndex = runtimeInsertIndex;

    item.dependencies.forEach((name) => {
      const dependencyIndex = findTopLevelDeclarationIndex(body, name);
      if (dependencyIndex >= insertIndex) {
        insertIndex = dependencyIndex + 1;
      }
    });

    body.splice(insertIndex, 0, item.declaration);
    runtimeInsertIndex = insertIndex + 1;
  });
}

function findTopLevelDeclarationIndex(
  body: BabelTypes.Program['body'],
  name: string,
): number {
  for (let i = 0; i < body.length; i++) {
    if (statementDeclaresName(body[i], name)) return i;
  }

  return -1;
}

function statementDeclaresName(
  statement: BabelTypes.Statement,
  name: string,
): boolean {
  if (statement.type === 'VariableDeclaration') {
    return statement.declarations.some((decl) => bindingPatternDeclaresName(decl.id as BabelTypes.Node, name));
  }

  if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
    return statementDeclaresName(statement.declaration, name);
  }

  if (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') {
    return statement.id?.name === name;
  }

  return false;
}

function bindingPatternDeclaresName(
  node: BabelTypes.Node,
  name: string,
): boolean {
  if (node.type === 'Identifier') return node.name === name;

  if (node.type === 'ObjectPattern') {
    return node.properties.some((prop) => {
      if (prop.type === 'RestElement') return bindingPatternDeclaresName(prop.argument as BabelTypes.Node, name);
      return bindingPatternDeclaresName(prop.value as BabelTypes.Node, name);
    });
  }

  if (node.type === 'ArrayPattern') {
    return node.elements.some((element) => !!element && bindingPatternDeclaresName(element as BabelTypes.Node, name));
  }

  if (node.type === 'AssignmentPattern') {
    return bindingPatternDeclaresName(node.left, name);
  }

  if (node.type === 'RestElement') {
    return bindingPatternDeclaresName(node.argument, name);
  }

  return false;
}
