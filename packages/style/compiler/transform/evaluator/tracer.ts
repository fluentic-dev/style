import type * as BabelCore from '@babel/core';
import * as crypto from 'node:crypto';
import type { CompilerInternal } from '../../compiler';
import { FN_STYLE, IMPORT_PATHS } from '../../utils/constants';
import { resolveFile } from '../../utils/file_resolver';
import { computeSlotId, extractStyleChain } from '../extract/chain';
import { getProjectFileId } from '../utils/path';
import type { EvalScope } from './evaluator';
import { evalFail, evalOk, evaluateNode } from './evaluator';
import type { EvalModuleBindings, EvalResult, EvalSlotRef, ImportMap, ResolveImportFn } from './types';

export type Tracer = ReturnType<typeof createTracer>;

type TraceCacheContent = {
  bindings: Array<[string, EvalResult]>;
};

const CACHE_TYPE = 'transform-trace';
const TRACE_PARSE_OPTIONS: BabelCore.TransformOptions = {
  configFile: false,
  babelrc: false,
  parserOpts: {
    plugins: ['typescript', 'jsx'],
    strictMode: false,
    allowImportExportEverywhere: true,
  },
};

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
    const cached = internal.cache.getItem({
      filePath: resolved.filePath,
      contentHash,
      cacheType: CACHE_TYPE,
    }) as TraceCacheContent | null;

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
): EvalModuleBindings | null {
  let ast: BabelCore.types.File | null = null;

  try {
    const parsed = babel.parseSync(content, {
      ...TRACE_PARSE_OPTIONS,
      filename: filePath,
    });
    ast = parsed as BabelCore.types.File;
  } catch {
    return null;
  }

  if (!ast) return null;

  const imports: ImportMap = new Map();
  const rawBindings: Map<string, BabelCore.types.Node> = new Map();
  const bindings: EvalModuleBindings = new Map();
  const styleNames = new Set<string>();
  const fileId = getProjectFileId(projectDir, filePath);

  for (const stmt of ast.program.body) {
    if (stmt.type === 'ImportDeclaration') {
      const source = stmt.source.value;

      for (const spec of stmt.specifiers) {
        if (spec.type === 'ImportSpecifier') {
          const imported = spec.imported.type === 'Identifier'
            ? spec.imported.name
            : spec.imported.value;

          imports.set(spec.local.name, { source, name: imported });

          if (IMPORT_PATHS.includes(source) && imported === FN_STYLE) {
            styleNames.add(spec.local.name);
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
    filePath,
    resolveImport,
  };

  rawBindings.forEach((node, name) => {
    bindings.set(name, evaluateResolvedNode(node, scope, styleNames, fileId));
  });

  return bindings;
}

function collectVariableBindings(
  bindings: Map<string, BabelCore.types.Node>,
  declaration: BabelCore.types.VariableDeclaration,
) {
  for (const decl of declaration.declarations) {
    if (decl.id.type === 'Identifier' && decl.init) {
      bindings.set(decl.id.name, decl.init);
    }
  }
}

function evaluateResolvedNode(
  node: BabelCore.types.Node,
  scope: EvalScope,
  styleNames: Set<string>,
  fileId: string,
): EvalResult {
  if (node.type === 'CallExpression') {
    const chain = extractStyleChain(node, styleNames);

    if (chain?.kind === 'slot') {
      return createSlotRef(fileId, node.loc?.start);
    }
  }

  if (node.type === 'ObjectExpression') {
    return evaluateResolvedObject(node, scope, styleNames, fileId);
  }

  return evaluateNode(node, scope);
}

function evaluateResolvedObject(
  node: BabelCore.types.ObjectExpression,
  scope: EvalScope,
  styleNames: Set<string>,
  fileId: string,
): EvalResult {
  const result: Record<string, unknown> = {};

  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement') {
      const value = evaluateResolvedNode(prop.argument, scope, styleNames, fileId);
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

    const value = evaluateResolvedNode(prop.value as BabelCore.types.Node, scope, styleNames, fileId);
    if (!value.ok && value.reason !== 'slot-ref') return value;

    result[String(key.value)] = value.ok ? value.value : value;
  }

  return evalOk(result);
}

function getObjectPropertyKey(
  prop: BabelCore.types.ObjectProperty,
  scope: EvalScope,
): EvalResult {
  if (prop.computed) return evaluateNode(prop.key as BabelCore.types.Node, scope);
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
