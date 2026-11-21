import * as crypto from 'node:crypto';
import { BUILDER_TYPE_SCOPE } from '../../../builder/data';
import { TRACE_STYLE, TRACE_VALUE } from '../../../builder/data/debug';
import { createExtractedScope, createExtractedSheet, createExtractedStyle } from '../../../builder/extract';
import type { ExtractedSheetTuple, ExtractedStyleTuple } from '../../../builder/extract';
import type { CompilerInternal } from '../../compiler';
import type { CompilerOptions } from '../../compiler/types';
import { clearResolverCache, resolveFile } from '../../utils/file_resolver';
import { createImportSourceMatcher } from '../../utils/import_source';
import {
  compileChain,
  type CompiledChainData,
  type CompiledCssItem,
  type CompiledItem,
  computeSlotId,
  extractStyleChain,
} from '../extract/chain';
import { annotateAtRuleDeclaration, annotateTokenDeclaration } from '../syntax/static_ids';
import type { BabelCore, BabelTypes } from '../utils/babel';
import { getProjectFileId } from '../utils/path';
import type { CompiledStyleObject, CompiledStyleObjectLocations, EvalScope } from './evaluator';
import { COMPILED_STYLE_OBJECT_LOCATIONS, evalFail, evalOk, evaluateEnumDeclaration, evaluateNode } from './evaluator';
import { LazyBindings } from './lazy_bindings';
import { createTraceMetadataCache } from './metadata_cache';
import type { EvalModuleBindings, EvalResult, EvalSlotRef, ImportMap, ResolveImportFn } from './types';

export type Tracer = ReturnType<typeof createTracer>;

type TraceCacheContent = {
  bindings: EvalModuleBindings;
  dependencies?: TraceDependency[];
};

const CACHE_TYPE = 'transform-trace-links-v2';

type TraceDependency = {
  source: string;
  fromFile: string;
  filePath: string | null;
  contentHash: string | null;
};

type TraceResult = TraceDependency & {
  filePath: string;
  contentHash: string;
  bindings: EvalModuleBindings;
  dependencies: TraceDependency[];
};

export function createTracer(internal: CompilerInternal) {
  const active = new Set<string>();
  const cyclic = new Set<string>();
  const metadata = createTraceMetadataCache(internal);

  const resolveImport = (
    babel: typeof BabelCore,
    source: string,
    fromFile: string,
  ): EvalModuleBindings | null => {
    return traceModuleResult(babel, source, fromFile)?.bindings ?? null;
  };

  const traceModuleResult = (
    babel: typeof BabelCore,
    source: string,
    fromFile: string,
  ): TraceResult | null => {
    const resolved = resolveFile(source, fromFile);
    if (!resolved) return null;

    const contentHash = hashContent(resolved.content);

    const cached = internal.cache.getItem<TraceCacheContent>({
      filePath: resolved.filePath,
      contentHash,
      cacheType: CACHE_TYPE,
    });

    if (cached?.bindings instanceof Map && areDependenciesFresh(cached.dependencies ?? [])) {
      return {
        source,
        fromFile,
        filePath: resolved.filePath,
        contentHash,
        bindings: cached.bindings,
        dependencies: cached.dependencies ?? [],
      };
    }

    if (active.has(resolved.filePath)) {
      // Partial export-star maps depend on which module entered the cycle first.
      // Reconstruct them from syntax instead of retaining that partial evaluation.
      for (const file of active) cyclic.add(file);
      return null;
    }
    active.add(resolved.filePath);

    try {
      const dependencies = new Map<string, TraceDependency>();
      const dependencyList: TraceDependency[] = [];
      const onTrack = () => {
        dependencyList.splice(0, dependencyList.length, ...dependencies.values());
      };
      const resolveDependency: ResolveImportFn = (source, fromFile) => {
        // Record lookup requests, including failures, so resolution changes are visible.
        const dependency = resolveFile(source, fromFile);
        addTraceDependency(dependencies, {
          source,
          fromFile,
          filePath: dependency?.filePath ?? null,
          contentHash: dependency ? hashContent(dependency.content) : null,
        });
        onTrack();
        const traced = traceModuleResult(babel, source, fromFile);
        if (!traced) return null;

        return createTrackedBindings(traced, dependencies, onTrack, () => traceModuleResult(babel, source, fromFile));
      };

      const ast = metadata.parse(babel, resolved.filePath, resolved.content);
      if (!ast) return null;
      const bindings = extractModuleBindings(
        internal.projectDir,
        resolved.filePath,
        ast,
        babel,
        resolveDependency,
        internal.options,
      );
      if (!bindings) return null;

      if (!cyclic.has(resolved.filePath)) {
        internal.cache.setItem<TraceCacheContent>({
          filePath: resolved.filePath,
          contentHash,
          cacheType: CACHE_TYPE,
          persistent: false,
          cacheContent: {
            bindings,
            dependencies: dependencyList,
          },
        });
      }

      return {
        source,
        fromFile,
        filePath: resolved.filePath,
        contentHash,
        bindings,
        dependencies: dependencyList,
      };
    } finally {
      active.delete(resolved.filePath);
    }
  };

  const traceModule = (
    babel: typeof BabelCore,
    source: string,
    fromFile: string,
  ): EvalModuleBindings | null => {
    return traceModuleResult(babel, source, fromFile)?.bindings ?? null;
  };

  return {
    resolveImport,
    traceModule,
    getMetadataCacheStats: metadata.getStats,
    beginCompilation() {
      clearResolverCache();
      cyclic.clear();
    },
  };
}

function extractModuleBindings(
  projectDir: string,
  filePath: string,
  ast: BabelTypes.File,
  babel: typeof BabelCore,
  resolveImport: ResolveImportFn,
  options: CompilerOptions,
): EvalModuleBindings | null {
  const imports: ImportMap = new Map();
  const rawBindings: Map<string, BabelTypes.Node> = new Map();
  const bindings = new LazyBindings();
  const styleNames = new Set<string>();
  const styleMetas = new Map();
  const fileId = getProjectFileId(projectDir, filePath);
  const importSourceMatcher = createImportSourceMatcher(options.importSources ?? null);
  const staticIdState = { fileId, imports, styleNames };
  const t = babel.types;

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
      annotateVariableDeclaration(stmt, staticIdState, t);
      collectVariableBindings(rawBindings, stmt);
      continue;
    }

    if (stmt.type === 'TSEnumDeclaration') {
      bindings.set(
        stmt.id.name,
        evaluateEnumDeclaration(stmt, {
          bindings,
          imports,
          filePath,
          resolveImport,
        }),
      );
      continue;
    }

    if (stmt.type === 'ExportNamedDeclaration') {
      if (stmt.declaration?.type === 'TSEnumDeclaration') {
        bindings.set(
          stmt.declaration.id.name,
          evaluateEnumDeclaration(stmt.declaration, {
            bindings,
            imports,
            filePath,
            resolveImport,
          }),
        );
        continue;
      }

      if (stmt.declaration?.type === 'VariableDeclaration') {
        annotateVariableDeclaration(stmt.declaration, staticIdState, t);
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
          rawBindings.set(exported, t.identifier(exported));
        } else if (rawBindings.has(local)) {
          rawBindings.set(exported, rawBindings.get(local)!);
        } else if (bindings.has(local)) {
          bindings.set(exported, bindings.get(local)!);
        } else if (imports.has(local)) {
          rawBindings.set(exported, t.identifier(local));
        }
      }

      continue;
    }

    if (stmt.type === 'ExportAllDeclaration') {
      const exported = resolveImport(stmt.source.value, filePath);
      if (exported) {
        for (const key of exported.keys()) {
          if (key !== 'default') bindings.setLazy(key, () => exported.get(key)!);
        }
      }
    }

    if (stmt.type === 'ExportDefaultDeclaration') {
      rawBindings.set('default', stmt.declaration);
    }
  }

  const scope: EvalScope = {
    tokenNameFormat: options.css?.tokenNameFormat ?? null,
    bindings,
    imports,
    styleNames,
    styleMetas,
    filePath,
    sourcemapTrace: options.dev?.sourcemapMode ?? 'style',
    resolveImport,
    bindingNodes: rawBindings,
  };

  rawBindings.forEach((node, name) => {
    bindings.setLazy(name, () => {
      const imported = imports.get(name);
      if (imported && node.type === 'Identifier' && node.name === name) {
        return resolveImport(imported.source, filePath)?.get(imported.name) ??
          evalFail(`Cannot resolve export: ${name}`);
      }
      return evaluateResolvedNode(node, scope, styleNames, fileId, options);
    });
  });

  return bindings;
}

function annotateVariableDeclaration(
  declaration: BabelTypes.VariableDeclaration,
  state: Parameters<typeof annotateTokenDeclaration>[1],
  t: typeof BabelTypes,
) {
  for (const decl of declaration.declarations) {
    annotateTokenDeclaration(decl, state, t);
    annotateAtRuleDeclaration(decl, state, t);
  }
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

        const result = compileChain(
          chain,
          fileId,
          node.loc?.start,
          scope,
          options,
          scope.runtimeMode ?? null,
          meta,
          styleNames,
        );
        if (!result) return evalFail('Cannot compile imported style chain');

        const traceResult = options.dev?.sourcemapMode === 'value'
          ? result
          : compileChain(
            chain,
            fileId,
            node.loc?.start,
            scope,
            {
              ...options,
              dev: {
                ...options.dev,
                sourcemapMode: 'value',
              },
            },
            scope.runtimeMode ?? null,
            meta,
            styleNames,
          ) ?? result;

        const extracted = createExtractedChainValue(result, traceResult);
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
  const result: CompiledStyleObject = {};
  const locations: CompiledStyleObjectLocations = {};

  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement') {
      const value = evaluateResolvedNode(prop.argument, scope, styleNames, fileId, options);
      if (!value.ok) return value;
      if (value.value && typeof value.value === 'object') {
        Object.assign(result, value.value);

        const sourceLocations = (value.value as CompiledStyleObject)[COMPILED_STYLE_OBJECT_LOCATIONS];
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

    if (prop.loc?.start) {
      const variableLoc = prop.value.loc?.start ?? prop.loc?.start;

      locations[String(key.value)] = {
        line: prop.loc.start.line,
        column: prop.loc.start.column + 1,
        filePath: scope.styleFilePath ?? scope.filePath,
        variableLine: variableLoc?.line,
        variableColumn: variableLoc ? variableLoc.column + 1 : undefined,
      };
    }
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

function createExtractedChainValue(
  result: CompiledChainData,
  traceResult: CompiledChainData = result,
): unknown {
  if (result.type === 'style') {
    const style = createExtractedStyle(
      result.items
        .filter(Array.isArray)
        .map((item) => toExtractedStyleTuple(item as CompiledCssItem)),
    );

    defineCompiledStyleLocations(style, traceResult);

    return style;
  }

  if (result.type === 'sheet') {
    const sheet = createExtractedSheet(
      result.items
        .filter(Array.isArray)
        .map((item) => toExtractedStyleTuple(item as CompiledCssItem) as ExtractedSheetTuple),
      result.sheetOptions,
    );

    defineCompiledStyleLocations(sheet, traceResult);

    return sheet;
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

function defineCompiledStyleLocations(
  value: CompiledStyleObject,
  result: CompiledChainData,
) {
  const locations: CompiledStyleObjectLocations = {};

  for (const item of result.items) {
    if (!Array.isArray(item) || !item.sourceTrace) continue;

    locations[item.sourceTrace.property] = {
      filePath: item.sourceTrace.filePath,
      line: item.sourceTrace.line,
      column: item.sourceTrace.column,
      trace: TRACE_VALUE,
    };
  }

  if (!Object.keys(locations).length) return;

  Object.defineProperty(value, COMPILED_STYLE_OBJECT_LOCATIONS, {
    configurable: true,
    enumerable: false,
    value: locations,
  });
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
  if (item.hasParentSelector) tuple.push(1);

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
  return crypto.createHash('sha256').update(content).digest('hex');
}

function addTraceDependency(
  dependencies: Map<string, TraceDependency>,
  dependency: TraceDependency,
) {
  dependencies.set(JSON.stringify([dependency.source, dependency.fromFile]), dependency);
}

function createTrackedBindings(
  traced: TraceResult,
  dependencies: Map<string, TraceDependency>,
  onTrack: () => void,
  refresh: () => TraceResult | null,
): EvalModuleBindings {
  const track = () => {
    addTraceDependency(dependencies, traced);
    traced.dependencies.forEach((dependency) => addTraceDependency(dependencies, dependency));
    onTrack();
  };

  const bindings = new LazyBindings();
  for (const key of traced.bindings.keys()) {
    bindings.setLazy(key, () => {
      // A lazy export may first be requested in a later compilation. Refresh its
      // module before using a previously captured binding map.
      const current = refresh();
      if (!current) return evalFail(`Cannot resolve export: ${key}`);
      traced = current;
      const value = traced.bindings.get(key) ?? evalFail(`Cannot resolve export: ${key}`);
      track();
      return value;
    });
  }
  // Record the module itself even when a requested export is missing. Values
  // add their transitive dependencies after lazy resolution has completed.
  track();
  return bindings;
}

function areDependenciesFresh(dependencies: TraceDependency[]): boolean {
  for (const dependency of dependencies) {
    const current = resolveFile(dependency.source, dependency.fromFile);
    if (
      (current?.filePath ?? null) !== dependency.filePath ||
      (current ? hashContent(current.content) : null) !== dependency.contentHash
    ) return false;
  }
  return true;
}
