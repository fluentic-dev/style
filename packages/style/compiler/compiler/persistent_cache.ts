import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import { types } from 'node:util';
import { deserialize, serialize } from 'node:v8';
import { CHECK_CONFIG } from '../../config/config/check';
import { CSS_CONFIG } from '../../config/config/css';
import { CSS_EXTRA_CONFIG } from '../../config/config/css_extra';
import { DEBUG_CONFIG } from '../../config/config/debug';
import { DEV_CONFIG, IS_DEV } from '../../config/config/dev';
import { RUNTIME_CONFIG } from '../../config/config/runtime';
import { PrioritySelectors } from '../../selector/presets';
import { getStyleFnMeta } from '../../style/style';
import { symbol } from '../../utils/symbol';
import { type CheckDiagnostic, observeCheckDiagnostics } from '../utils/check_diagnostics';
import { DEFAULT_CONFIG } from '../utils/constants';
import { clearResolverCache, observeFileResolutions, resolveFile } from '../utils/file_resolver';
import { getCompilerCacheIdentity } from './cache_identity';
import type { CompilerInternal } from './compiler';
import type { TransformExtractArgs, TransformExtractResult } from './types';

type Dependency = { source: string; fromFile: string; filePath: string | null; hash: string | null; };
type CachedError = { name: string; message: string; stack?: string; };
type RecordData = {
  key: string;
  dependencies: Dependency[];
  result: TransformExtractResult | null;
  diagnostics: CheckDiagnostic[];
  error: CachedError | null;
};

export function createPersistentTransformCache(internal: CompilerInternal) {
  const stats = { hits: 0, misses: 0, bypasses: 0, writes: 0 };
  const directory = path.join(internal.cacheDir, 'extract-v1');
  let previousContext: string | null = null;
  const contextFor = (): string | null => {
    if (internal.options.cache?.persistent === false || DEV_CONFIG.isDev) return null;
    try {
      const identity = getCompilerCacheIdentity();
      if (!identity) return null;
      const options = internal.options;
      // Reject accessors/proxies before inspecting or normalizing configuration.
      assertDataProperties(options);
      if (Object.getPrototypeOf(options) !== Object.prototype && Object.getPrototypeOf(options) !== null) {
        throw new Error('Non-plain compiler options');
      }
      if (options.importSources) assertPlainArray(options.importSources);
      const importSources = options.importSources?.map((entry) => {
        assertDataProperties(entry);
        if (Object.getPrototypeOf(entry) !== Object.prototype && Object.getPrototypeOf(entry) !== null) {
          throw new Error('Non-plain import source');
        }
        if (entry.styleFn && types.isProxy(entry.styleFn)) throw new Error('Proxy style function');
        if (!entry.meta && entry.styleFn) {
          const metadata = Object.getOwnPropertyDescriptor(entry.styleFn, symbol('style.fn:meta'));
          if (!metadata || !('value' in metadata)) throw new Error('Dynamic style metadata');
        }
        return {
          ...entry,
          styleFn: undefined,
          meta: entry.meta ?? (entry.styleFn ? getStyleFnMeta(entry.styleFn) : null),
        };
      });
      return digest(encode({
        schema: 1,
        identity,
        cwd: process.cwd(),
        projectDir: internal.projectDir,
        runtimeMode: internal.runtimeMode,
        options: { ...options, importSources },
        globals: {
          CSS_CONFIG,
          CSS_EXTRA_CONFIG,
          DEBUG_CONFIG,
          DEV_CONFIG,
          IS_DEV,
          RUNTIME_CONFIG,
          CHECK_CONFIG,
          DEFAULT_CONFIG,
          PrioritySelectors,
        },
      }, options.cache?.dynamicConfig !== false));
    } catch {
      return null;
    }
  };
  const run = (args: TransformExtractArgs, compile: () => TransformExtractResult | null) => {
    const context = contextFor();
    let key: string | null = null;
    try {
      if (context) key = digest(encode({ context, args }));
    } catch { /* Unsupported input. */ }
    if (!key) {
      stats.bypasses++;
      previousContext = null;
      internal.cache.clear();
      clearResolverCache();
      return { result: compile(), hit: false };
    }
    // Different Node/compiler versions may build the same project concurrently.
    // Keep their records separate instead of repeatedly displacing each other.
    const filename = path.join(
      directory,
      getCompilerCacheIdentity()!,
      digest(encode(internal.options.cache?.version)),
      digest(args.filePath) + '.bin',
    );
    // A new snapshot for each compilation: never trust resolver or mtime caches across calls.
    clearResolverCache();
    let hit: RecordData | undefined;
    try {
      const buffer = fs.readFileSync(filename);
      const body = buffer.subarray(65);
      if (buffer.subarray(0, 64).toString() === digest(body)) {
        const record = deserialize(body) as RecordData;
        if (
          record.key === key && Array.isArray(record.dependencies) && validRecord(record) &&
          record.dependencies.every(isFresh)
        ) {
          hit = record;
        }
      }
    } catch {
      // Missing, truncated, incompatible, or otherwise unreadable cache: compile normally.
    }
    // Replay outside the read/recovery catch: cached errors must still fail builds.
    if (hit) {
      stats.hits++;
      for (const diagnostic of hit.diagnostics) {
        if (diagnostic.level === 'warn') console.warn('[fluentic-style] ' + diagnostic.message);
      }
      if (hit.error) {
        const error = new Error(hit.error.message);
        error.name = hit.error.name;
        error.stack = hit.error.stack;
        throw error;
      }
      return { result: hit.result, hit: true };
    }
    stats.misses++;
    clearResolverCache();
    // Tracer hits revalidate/replay their lookup graph into the active observer.
    // Evaluated bindings are reusable only under the same compiler configuration.
    if (context !== previousContext) internal.cache.clear();
    previousContext = context;
    const dependencies = new Map<string, Dependency>();
    const diagnostics: CheckDiagnostic[] = [];
    let result: TransformExtractResult | null = null;
    let failure: Error | null = null;
    try {
      result = observeCheckDiagnostics(
        (diagnostic) => diagnostics.push(diagnostic),
        () =>
          observeFileResolutions((source, fromFile, resolved) => {
            dependencies.set(JSON.stringify([source, fromFile]), {
              source,
              fromFile,
              filePath: resolved?.filePath ?? null,
              hash: resolved ? digest(resolved.content) : null,
            });
          }, compile),
      );
    } catch (error) {
      // Cache deliberate check failures only, not arbitrary compiler/I/O errors.
      if (!(error instanceof Error) || diagnostics[diagnostics.length - 1]?.level !== 'error') throw error;
      failure = error;
    }
    const cachedError = failure ? { name: failure.name, message: failure.message, stack: failure.stack } : null;
    if (result || failure) {
      let temporary: string | undefined;
      try {
        encode(result); // Only persist plain data; never evaluator functions/symbols.
        const records = [...dependencies.values()];
        clearResolverCache();
        // Do not save a mixed snapshot if inputs/configuration changed during extraction.
        if (!records.every(isFresh) || contextFor() !== context) throw new Error('Cache snapshot changed');
        const body = serialize(
          { key, dependencies: records, result, diagnostics, error: cachedError } satisfies RecordData,
        );
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        temporary = filename + '.' + randomUUID() + '.tmp';
        fs.writeFileSync(temporary, Buffer.concat([Buffer.from(digest(body) + '\n'), body]));
        fs.renameSync(temporary, filename);
        stats.writes++;
      } catch {
        // Caching is optional; permission/disk/serialization failures cannot fail a build.
      } finally {
        if (temporary) {
          try {
            fs.unlinkSync(temporary);
          } catch { /* Already renamed or unavailable. */ }
        }
      }
    }
    if (failure) throw failure;
    return { result, hit: false };
  };
  return { run, getStats: () => ({ ...stats }) };
}

function isFresh(dependency: Dependency): boolean {
  if (typeof dependency.source !== 'string' || typeof dependency.fromFile !== 'string') return false;
  const resolved = resolveFile(dependency.source, dependency.fromFile);
  return (resolved?.filePath ?? null) === dependency.filePath &&
    (resolved ? digest(resolved.content) : null) === dependency.hash;
}

function validRecord(record: RecordData): boolean {
  if (
    !Array.isArray(record.diagnostics) ||
    !record.diagnostics.every((item) =>
      item && (item.level === 'warn' || item.level === 'error') && typeof item.message === 'string'
    )
  ) return false;
  if (record.error) {
    return record.result === null && record.diagnostics[record.diagnostics.length - 1]?.level === 'error' &&
      typeof record.error.name === 'string' && typeof record.error.message === 'string' &&
      (record.error.stack === undefined || typeof record.error.stack === 'string');
  }
  return record.error === null && record.diagnostics.every((item) => item.level === 'warn') &&
    validResult(record.result);
}

function validResult(result: TransformExtractResult | null): boolean {
  return !!result && typeof result.code === 'string' &&
    (result.sourcemap === null || typeof result.sourcemap === 'string') && Array.isArray(result.rules) &&
    result.rules.every((rule) =>
      typeof rule.css === 'string' && typeof rule.dedupe === 'string' &&
      typeof rule.className === 'string' && Array.isArray(rule.priority)
    );
}

function digest(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function assertDataProperties(value: object) {
  if (types.isProxy(value)) throw new Error('Proxy configuration');
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (
      typeof key === 'symbol' || !('value' in descriptor) ||
      (!descriptor.enumerable && !(Array.isArray(value) && key === 'length') &&
        !(value instanceof RegExp && key === 'lastIndex'))
    ) {
      throw new Error('Dynamic configuration');
    }
  }
}

function assertPlainArray(value: unknown[]) {
  assertDataProperties(value);
  if (
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.keys(value).some((key) => !/^(0|[1-9][0-9]*)$/.test(key))
  ) {
    throw new Error('Non-plain array');
  }
}

/** Tagged, order-preserving encoding: property order can affect generated CSS. */
function encode(value: unknown, dynamicConfig = false): string {
  return JSON.stringify(encodeValue(value, new Set(), dynamicConfig));
}

function encodeValue(value: unknown, seen = new Set<object>(), dynamicConfig = false): unknown {
  if (typeof value === 'function' && dynamicConfig) {
    if (types.isProxy(value)) throw new Error('Proxy callback');
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || !['length', 'name', 'prototype', 'arguments', 'caller'].includes(key)) {
        throw new Error('Callback with custom properties');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!('value' in descriptor)) throw new Error('Callback accessor');
    }
    const source = Function.prototype.toString.call(value);
    if (source.includes('[native code]')) throw new Error('Opaque callback');
    return ['function', source];
  }
  if (value === undefined) return ['undefined'];
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return ['number', Object.is(value, -0) ? '-0' : value];
  }
  if (typeof value !== 'object' || value === null || seen.has(value)) throw new Error('Unsupported cache input');
  assertDataProperties(value);
  if (value instanceof RegExp) {
    if (
      value.global || value.sticky || Object.getPrototypeOf(value) !== RegExp.prototype || Object.keys(value).length
    ) {
      throw new Error('Dynamic pattern');
    }
    return ['regexp', value.source, value.flags];
  }
  if (Array.isArray(value)) assertPlainArray(value);
  if (
    !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null
  ) {
    throw new Error('Non-plain cache input');
  }
  seen.add(value);
  try {
    return [
      Array.isArray(value) ? ['array', value.length] : 'object',
      Object.keys(value).map((key) => [key, encodeValue((value as Record<string, unknown>)[key], seen, dynamicConfig)]),
    ];
  } finally {
    seen.delete(value);
  }
}
