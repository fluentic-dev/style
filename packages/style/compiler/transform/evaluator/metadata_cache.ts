import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import type { CompilerInternal } from '../../compiler';
import { getCompilerCacheIdentity } from '../../compiler/cache_identity';
import { BabelCore, babelTransformOptions } from '../utils/babel';
import type { BabelTypes } from '../utils/babel';

const defaultParser = BabelCore.parseSync;
const MAX_MEMORY_BYTES = 32 * 1024 * 1024;
type MemoryEntry = { contentHash: string; json: string; };
type DiskEntry = { version: 1; filePath: string; contentHash: string; checksum: string; ast: BabelTypes.File; };

/** Immutable syntax only. Every consumer gets fresh nodes before annotations/evaluation. */
export function createTraceMetadataCache(internal: CompilerInternal) {
  const memory = new Map<string, MemoryEntry>();
  let memoryBytes = 0;
  let memoryVersion = internal.options.cache?.version;
  const stats = { parses: 0, memoryHits: 0, diskHits: 0, writes: 0 };
  const remember = (filePath: string, contentHash: string, json: string) => {
    const previous = memory.get(filePath);
    if (previous) memoryBytes -= previous.json.length * 2;
    memory.delete(filePath);
    if (json.length * 2 > MAX_MEMORY_BYTES) return;
    while (memoryBytes + json.length * 2 > MAX_MEMORY_BYTES) {
      const oldest = memory.keys().next().value!;
      memoryBytes -= memory.get(oldest)!.json.length * 2;
      memory.delete(oldest);
    }
    memory.set(filePath, { contentHash, json });
    memoryBytes += json.length * 2;
  };
  const parse = (babel: typeof BabelCore, filePath: string, content: string): BabelTypes.File | null => {
    if (!Object.is(memoryVersion, internal.options.cache?.version)) {
      memory.clear();
      memoryBytes = 0;
      memoryVersion = internal.options.cache?.version;
    }
    const supportedParser = babel.parseSync === defaultParser;
    const contentHash = hash(content);
    const cached = supportedParser ? memory.get(filePath) : undefined;
    if (cached?.contentHash === contentHash) {
      stats.memoryHits++;
      memory.delete(filePath);
      memory.set(filePath, cached);
      return JSON.parse(cached.json) as BabelTypes.File;
    }
    const identity = supportedParser && internal.options.cache?.persistent !== false
      ? getCompilerCacheIdentity()
      : null;
    const filename = identity
      ? path.join(
        internal.cacheDir,
        'trace-metadata-v1',
        identity,
        hash(JSON.stringify(internal.options.cache?.version ?? null)),
        hash(filePath) + '.json',
      )
      : null;
    if (filename) {
      try {
        const record = JSON.parse(fs.readFileSync(filename, 'utf8')) as DiskEntry;
        if (
          record.version === 1 && record.filePath === filePath && record.contentHash === contentHash &&
          record.ast?.type === 'File' && record.ast.program?.type === 'Program' &&
          Array.isArray(record.ast.program.body)
        ) {
          const json = JSON.stringify(record.ast);
          if (record.checksum === hash(json)) {
            remember(filePath, contentHash, json);
            stats.diskHits++;
            return record.ast;
          }
        }
      } catch {
        // Unreadable/corrupt metadata is a cache miss, never a compiler error.
      }
    }
    let ast: BabelTypes.File | null;
    try {
      stats.parses++;
      ast = babel.parseSync(content, { ...babelTransformOptions(), filename: filePath }) as BabelTypes.File | null;
    } catch {
      return null;
    }
    if (!ast || !supportedParser) return ast;
    let temporary: string | undefined;
    try {
      // JSON cannot preserve non-finite literal values or runtime objects.
      const json = JSON.stringify(ast, (_key, value: unknown) => {
        if (
          typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0)) ||
          typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol'
        ) {
          throw new Error('Non-JSON syntax data');
        }
        return value;
      });
      remember(filePath, contentHash, json);
      if (filename) {
        const record: DiskEntry = { version: 1, filePath, contentHash, checksum: hash(json), ast };
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        temporary = filename + '.' + randomUUID() + '.tmp';
        fs.writeFileSync(temporary, JSON.stringify(record), 'utf8');
        fs.renameSync(temporary, filename);
        stats.writes++;
      }
    } catch {
      // Metadata reuse is optional. Parsing/evaluation still proceeds normally.
    } finally {
      if (temporary) {
        try {
          fs.unlinkSync(temporary);
        } catch { /* Already renamed or unavailable. */ }
      }
    }
    return ast;
  };
  return { parse, getStats: () => ({ ...stats }) };
}

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
