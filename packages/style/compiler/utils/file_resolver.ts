import * as fs from 'node:fs';
import { ResolverFactory } from 'oxc-resolver';

export type ResolveFileInfo = {
  source: string;
  fromFile: string;
};

export type ResolvedFile = {
  filePath: string;
  content: string;
  mtimeMs: number;
};

export type ResolveFileFn = (info: ResolveFileInfo) => ResolvedFile | null;

const contentCache = new Map<string, ResolvedFile>();
let resolutionObserver: ((source: string, fromFile: string, result: ResolvedFile | null) => void) | null = null;

/** Synchronous extraction only; restore the previous observer even when extraction throws. */
export function observeFileResolutions<T>(
  observer: NonNullable<typeof resolutionObserver>,
  run: () => T,
): T {
  const previous = resolutionObserver;
  resolutionObserver = (source, fromFile, result) => {
    previous?.(source, fromFile, result);
    observer(source, fromFile, result);
  };
  try {
    return run();
  } finally {
    resolutionObserver = previous;
  }
}

const resolver = new ResolverFactory({
  // Static evaluation needs executable values, never declaration-only exports.
  conditionNames: ['import', 'module', 'default'],
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
  mainFiles: ['index'],
  tsconfig: 'auto',
});

export function clearResolverCache(): void {
  contentCache.clear();
  resolver.clearCache();
}

export function resolveFile(
  source: string,
  fromFile: string,
): ResolvedFile | null {
  const result = readResolvedFile(source, fromFile);
  resolutionObserver?.(source, fromFile, result);
  return result;
}

function readResolvedFile(source: string, fromFile: string): ResolvedFile | null {
  const filePath = resolveFilePath(source, fromFile);
  if (!filePath) return null;

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return null;
  }

  if (!stat.isFile()) return null;

  const cached = contentCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached;

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const resolved: ResolvedFile = {
    filePath,
    content,
    mtimeMs: stat.mtimeMs,
  };

  contentCache.set(filePath, resolved);

  return resolved;
}

function resolveFilePath(source: string, fromFile: string): string | null {
  try {
    return resolver.resolveFileSync(fromFile, source).path ?? null;
  } catch {
    return null;
  }
}
