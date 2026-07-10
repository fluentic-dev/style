import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { BUILDER_TYPE_SCOPE } from '../../../builder/data';
import { TRACE_STYLE, TRACE_VALUE } from '../../../builder/data/debug';
import { createExtractedScope, createExtractedStyle } from '../../../builder/extract';
import type { ExtractedStyleTuple } from '../../../builder/extract';
import type { CompilerInternal } from '../../compiler';
import type { CompilerOptions } from '../../compiler/types';
import { resolveFile } from '../../utils/file_resolver';
import { createImportSourceMatcher } from '../../utils/import_source';
import {
  compileChain,
  type CompiledChainData,
  type CompiledCssItem,
  type CompiledItem,
  computeSlotId,
  extractStyleChain,
} from '../extract/chain';
import type { BabelCore, BabelTypes } from '../utils/babel';
import { babelTransformOptions } from '../utils/babel';
import { getProjectFileId } from '../utils/path';
import type { CompiledStyleObject, CompiledStyleObjectLocations, EvalScope } from './evaluator';
import { COMPILED_STYLE_OBJECT_LOCATIONS, evalFail, evalOk, evaluateEnumDeclaration, evaluateNode } from './evaluator';
import type { EvalModuleBindings, EvalResult, EvalSlotRef, ImportMap, ResolveImportFn } from './types';

export type Tracer = ReturnType<typeof createTracer>;

type TraceCacheContent = {
  bindings: Array<[string, EvalResult]>;
  dependencies?: TraceDependency[];
};

const CACHE_TYPE = 'transform-trace';

type TraceDependency = {
  filePath: string;
  contentHash: string;
};

type TraceResult = TraceDependency & {
  bindings: EvalModuleBindings;
  dependencies: TraceDependency[];
};

export function createTracer(internal: CompilerInternal) {
  const active = new Set<string>();

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

    if (cached && areDependenciesFresh(cached.dependencies ?? [])) {
      return {
        filePath: resolved.filePath,
        contentHash,
        bindings: new Map(cached.bindings),
        dependencies: cached.dependencies ?? [],
      };
    }

    if (active.has(resolved.filePath)) return null;
    active.add(resolved.filePath);

    try {
      const dependencies = new Map<string, TraceDependency>();
      const resolveDependency: ResolveImportFn = (source, fromFile) => {
        const traced = traceModuleResult(babel, source, fromFile);
        if (!traced) return null;

        return createTrackedBindings(traced, dependencies);
      };

      const bindings = parseAndExtractModule(
        internal.projectDir,
        resolved.filePath,
        resolved.content,
        babel,
        resolveDependency,
        internal.options,
      );
      if (!bindings) return null;

      const dependencyList = [...dependencies.values()];

      internal.cache.setItem<TraceCacheContent>({
        filePath: resolved.filePath,
        contentHash,
        cacheType: CACHE_TYPE,
        persistent: false,
        cacheContent: {
          bindings: [...bindings.entries()],
          dependencies: dependencyList,
        },
      });

      return {
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

    if (stmt.type === 'ExportDefaultDeclaration') {
      rawBindings.set('default', stmt.declaration);
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
    bindingNodes: rawBindings,
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
      locations[String(key.value)] = {
        line: prop.loc.start.line,
        column: prop.loc.start.column + 1,
        filePath: scope.styleFilePath ?? scope.filePath,
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
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function addTraceDependency(
  dependencies: Map<string, TraceDependency>,
  dependency: TraceDependency,
) {
  dependencies.set(dependency.filePath, dependency);
}

function createTrackedBindings(
  traced: TraceResult,
  dependencies: Map<string, TraceDependency>,
): EvalModuleBindings {
  const track = () => {
    addTraceDependency(dependencies, traced);
    traced.dependencies.forEach((dependency) => addTraceDependency(dependencies, dependency));
  };

  return new class extends Map<string, EvalResult> {
    constructor() {
      super(traced.bindings);
    }

    override get(key: string): EvalResult | undefined {
      const value = super.get(key);
      if (value !== undefined || super.has(key)) track();
      return value;
    }

    override has(key: string): boolean {
      const result = super.has(key);
      if (result) track();
      return result;
    }

    override forEach(
      callbackfn: (value: EvalResult, key: string, map: Map<string, EvalResult>) => void,
      thisArg?: unknown,
    ): void {
      track();
      super.forEach(callbackfn, thisArg);
    }
  }();
}

function areDependenciesFresh(
  dependencies: TraceDependency[],
): boolean {
  for (const dependency of dependencies) {
    const currentHash = hashFileContent(dependency.filePath);
    if (currentHash !== dependency.contentHash) return false;
  }

  return true;
}

function hashFileContent(filePath: string): string | null {
  try {
    return hashContent(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}
