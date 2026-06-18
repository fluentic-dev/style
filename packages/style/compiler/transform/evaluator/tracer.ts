import type { BabelCore, BabelTypes } from '../utils/babel';
import * as crypto from 'node:crypto';
import { BUILDER_TYPE_SCOPE } from '../../../builder/data';
import { createExtractedScope, createExtractedStyle } from '../../../builder/extract';
import type { ExtractedStyleTuple } from '../../../builder/extract';
import type { CompilerInternal } from '../../compiler';
import type { CompilerOptions } from '../../compiler/types';
import { createImportSourceMatcher } from '../../utils/import_source';
import { resolveFile } from '../../utils/file_resolver';
import {
  compileChain,
  type CompiledChainData,
  type CompiledCssItem,
  type CompiledItem,
  computeSlotId,
  extractStyleChain,
} from '../extract/chain';
import { babelTransformOptions } from '../utils/babel';
import { getProjectFileId } from '../utils/path';
import type { EvalScope } from './evaluator';
import { evalFail, evalOk, evaluateNode } from './evaluator';
import type { EvalModuleBindings, EvalResult, EvalSlotRef, ImportMap, ResolveImportFn } from './types';

export type Tracer = ReturnType<typeof createTracer>;

type TraceCacheContent = {
  bindings: Array<[string, EvalResult]>;
};

const CACHE_TYPE = 'transform-trace';

export function createTracer(internal: CompilerInternal) {
  const active = new Set<string>();

  const resolveImport = (
    babel: typeof BabelCore,
    source: string,
    fromFile: string,
  ): EvalModuleBindings | null => {
    return traceModule(babel, source, fromFile);
  };

  const traceModule = (
    babel: typeof BabelCore,
    source: string,
    fromFile: string,
  ): EvalModuleBindings | null => {
    const resolved = resolveFile(source, fromFile);
    if (!resolved) return null;

    const contentHash = hashContent(resolved.content);

    const cached = internal.cache.getItem<TraceCacheContent>({
      filePath: resolved.filePath,
      contentHash,
      cacheType: CACHE_TYPE,
    });

    if (cached) {
      return new Map(cached.bindings);
    }

    if (active.has(resolved.filePath)) return null;
    active.add(resolved.filePath);

    try {
      const bindings = parseAndExtractModule(
        internal.projectDir,
        resolved.filePath,
        resolved.content,
        babel,
        (source, fromFile) => resolveImport(babel, source, fromFile),
        internal.options,
      );
      if (!bindings) return null;

      internal.cache.setItem<TraceCacheContent>({
        filePath: resolved.filePath,
        contentHash,
        cacheType: CACHE_TYPE,
        persistent: false,
        cacheContent: {
          bindings: [...bindings.entries()],
        },
      });

      return bindings;
    } finally {
      active.delete(resolved.filePath);
    }
  };

  return {
    resolveImport,
    traceModule,
  };
}

function parseAndExtractModule(
  projectDir: string,
  filePath: string,
  content: string,
  babel: typeof BabelCore,
  resolveImport: ResolveImportFn,
  options: CompilerOptions,
): EvalModuleBindings | null {
  let ast: BabelTypes.File | null = null;

  try {
    const parsed = babel.parseSync(content, {
      ...babelTransformOptions(),
      filename: filePath,
    });
    ast = parsed as BabelTypes.File;
  } catch {
    return null;
  }

  if (!ast) return null;

  const imports: ImportMap = new Map();
  const rawBindings: Map<string, BabelTypes.Node> = new Map();
  const bindings: EvalModuleBindings = new Map();
  const styleNames = new Set<string>();
  const styleMetas = new Map();
  const fileId = getProjectFileId(projectDir, filePath);
  const importSourceMatcher = createImportSourceMatcher(options.importSources ?? null);

  for (const stmt of ast.program.body) {
    if (stmt.type === 'ImportDeclaration') {
      const source = stmt.source.value;

      for (const spec of stmt.specifiers) {
        if (spec.type === 'ImportSpecifier') {
          const imported = spec.imported.type === 'Identifier'
            ? spec.imported.name
            : spec.imported.value;

          imports.set(spec.local.name, { source, name: imported });

          const meta = importSourceMatcher({ source, name: imported });
          if (meta) {
            styleNames.add(spec.local.name);
            styleMetas.set(spec.local.name, meta);
          }
        } else if (spec.type === 'ImportDefaultSpecifier') {
          imports.set(spec.local.name, { source, name: 'default' });
        }
      }

      continue;
    }

    if (stmt.type === 'VariableDeclaration') {
      collectVariableBindings(rawBindings, stmt);
      continue;
    }

    if (stmt.type === 'ExportNamedDeclaration') {
      if (stmt.declaration?.type === 'VariableDeclaration') {
        collectVariableBindings(rawBindings, stmt.declaration);
        continue;
      }

      for (const spec of stmt.specifiers) {
        if (spec.type !== 'ExportSpecifier') continue;

        const local = spec.local.name;
        const exported = spec.exported.type === 'Identifier'
          ? spec.exported.name
          : spec.exported.value;

        if (stmt.source) {
          imports.set(exported, { source: stmt.source.value, name: local });
        } else if (rawBindings.has(local)) {
          rawBindings.set(exported, rawBindings.get(local)!);
        } else if (bindings.has(local)) {
          bindings.set(exported, bindings.get(local)!);
        }
      }

      continue;
    }

    if (stmt.type === 'ExportAllDeclaration') {
      const exported = resolveImport(stmt.source.value, filePath);
      if (exported) {
        exported.forEach((value, key) => {
          if (key !== 'default') bindings.set(key, value);
        });
      }
    }
  }

  const scope: EvalScope = {
    bindings,
    imports,
    styleNames,
    styleMetas,
    filePath,
    sourcemapTrace: options.dev?.sourcemapMode ?? 'style',
    resolveImport,
  };

  rawBindings.forEach((node, name) => {
    bindings.set(name, evaluateResolvedNode(node, scope, styleNames, fileId, options));
  });

  return bindings;
}

function collectVariableBindings(
  bindings: Map<string, BabelTypes.Node>,
  declaration: BabelTypes.VariableDeclaration,
) {
  for (const decl of declaration.declarations) {
    if (decl.id.type === 'Identifier' && decl.init) {
      bindings.set(decl.id.name, decl.init);
    }
  }
}

function evaluateResolvedNode(
  node: BabelTypes.Node,
  scope: EvalScope,
  styleNames: Set<string>,
  fileId: string,
  options: CompilerOptions,
): EvalResult {
  if (node.type === 'CallExpression') {
    const chain = extractStyleChain(node, styleNames);

    if (chain?.kind === 'slot') {
      return createSlotRef(fileId, node.loc?.start);
    }

    if (chain?.kind === 'style' || chain?.kind === 'scope') {
      try {
        const meta = scope.styleMetas?.get(chain.rootName);
        if (!meta) return evalFail('Cannot resolve imported style function');

        const result = compileChain(chain, fileId, node.loc?.start, scope, options, meta, styleNames);
        if (!result) return evalFail('Cannot compile imported style chain');

        const extracted = createExtractedChainValue(result);
        if (!extracted) return evalFail('Cannot extract imported style chain');

        return evalOk(extracted);
      } catch (error) {
        return evalFail(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (node.type === 'ObjectExpression') {
    return evaluateResolvedObject(node, scope, styleNames, fileId, options);
  }

  return evaluateNode(node, scope);
}

function evaluateResolvedObject(
  node: BabelTypes.ObjectExpression,
  scope: EvalScope,
  styleNames: Set<string>,
  fileId: string,
  options: CompilerOptions,
): EvalResult {
  const result: Record<string, unknown> = {};

  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement') {
      const value = evaluateResolvedNode(prop.argument, scope, styleNames, fileId, options);
      if (!value.ok) return value;
      if (value.value && typeof value.value === 'object') {
        Object.assign(result, value.value);
      }
      continue;
    }

    if (prop.type !== 'ObjectProperty') {
      return evalFail('Cannot evaluate ObjectMethod in style object');
    }

    const key = getObjectPropertyKey(prop, scope);
    if (!key.ok) return key;

    const value = evaluateResolvedNode(prop.value as BabelTypes.Node, scope, styleNames, fileId, options);
    if (!value.ok && value.reason !== 'slot-ref') return value;

    result[String(key.value)] = value.ok ? value.value : value;
  }

  return evalOk(result);
}

function createExtractedChainValue(result: CompiledChainData): unknown {
  if (result.type === 'style') {
    return createExtractedStyle(
      result.items
        .filter(Array.isArray)
        .map((item) => toExtractedStyleTuple(item as CompiledCssItem)),
    );
  }

  if (result.type === 'scope') {
    return createExtractedScope(
      result.items
        .map(toExtractedScopeItem)
        .filter((item) => item !== null),
    );
  }

  return null;
}

function toExtractedStyleTuple(item: CompiledCssItem): ExtractedStyleTuple {
  const startsWithType = typeof item[0] === 'number';
  const dedupe = String(startsWithType ? item[1] : item[0]);
  const className = String(startsWithType ? item[2] : item[1]);
  const value = startsWithType ? item[3] : item[2];

  return value === undefined
    ? [dedupe, className]
    : [dedupe, className, value as ExtractedStyleTuple[2]];
}

function toExtractedScopeItem(item: CompiledItem): Parameters<typeof createExtractedScope>[0][number] | null {
  if (!Array.isArray(item)) {
    return item.kind === 'token' ? item.value : null;
  }

  return toExtractedScopeTuple(item);
}

function toExtractedScopeTuple(item: CompiledCssItem) {
  const value = item[4];
  const tuple: unknown[] = [
    BUILDER_TYPE_SCOPE,
    String(item[1]),
    String(item[2]),
    String(item[3]),
  ];

  if (value !== undefined) tuple.push(value);
  if (item.hasParentSelector) tuple.push(true);

  return tuple as Parameters<typeof createExtractedScope>[0][number];
}

function getObjectPropertyKey(
  prop: BabelTypes.ObjectProperty,
  scope: EvalScope,
): EvalResult {
  if (prop.computed) return evaluateNode(prop.key as BabelTypes.Node, scope);
  if (prop.key.type === 'Identifier') return evalOk(prop.key.name);
  if (prop.key.type === 'StringLiteral') return evalOk(prop.key.value);
  if (prop.key.type === 'NumericLiteral') return evalOk(prop.key.value);
  return evalFail('Unsupported object property key');
}

function createSlotRef(
  fileId: string,
  loc: { line: number; column: number; } | null | undefined,
): EvalSlotRef {
  return {
    ok: false,
    reason: 'slot-ref',
    filePath: fileId,
    slotId: computeSlotId(fileId, loc),
  };
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}
