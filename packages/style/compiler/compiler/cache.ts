import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type CompilerCacheArgs = {
  cacheDir: string;
};

export type CompilerCacheFile<T = unknown> = {
  filePath: string;
  contentHash: string;
  cacheContent: T;
  cacheType: string;
};

export type CompilerCacheGetItemArgs = {
  filePath: string;
  contentHash: string;
  cacheType: string;
};

export type CompilerCacheSetItemArgs<T = unknown> = CompilerCacheGetItemArgs & {
  cacheContent: T;
  persistent?: boolean;
};

type CacheItem<T = unknown> = {
  contentHash: string;
  cacheContent: T;
  cacheType: string;
};

export type CompilerCache = ReturnType<typeof createCompilerCache>;

export function createCompilerCache(args: CompilerCacheArgs) {
  const { cacheDir } = args;

  const cache = new Map<string, CacheItem>();

  const getItem = <T>(args: CompilerCacheGetItemArgs) => {
    const key = getCacheKey(args);

    const cached = cache.get(key);

    if (
      cached &&
      cached.contentHash === args.contentHash &&
      cached.cacheType === args.cacheType
    ) {
      return cached.cacheContent;
    }

    const file = getCacheFile<T>(cacheDir, args);
    if (!file) return null;

    cache.set(key, {
      contentHash: file.contentHash,
      cacheContent: file.cacheContent,
      cacheType: file.cacheType,
    });

    return file.cacheContent as unknown as T;
  };

  const setItem = <T>(args: CompilerCacheSetItemArgs<T>) => {
    const key = getCacheKey(args);

    cache.set(key, {
      contentHash: args.contentHash,
      cacheContent: args.cacheContent,
      cacheType: args.cacheType,
    });

    saveCacheFile(cacheDir, args);
  };

  const clear = () => {
    cache.clear();
  };

  return {
    getItem,
    setItem,
    clear,
  };
}

function getCacheFile<TCacheContent>(
  cacheDir: string,
  args: CompilerCacheGetItemArgs,
): CompilerCacheFile<TCacheContent> | null {
  const filePath = getCacheFilePath(cacheDir, args);

  let raw: string;
  let file: CompilerCacheFile<TCacheContent>;

  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  try {
    file = JSON.parse(raw) as CompilerCacheFile<TCacheContent>;
  } catch {
    return null;
  }

  if (
    file.filePath !== args.filePath ||
    file.contentHash !== args.contentHash ||
    file.cacheType !== args.cacheType
  ) {
    return null;
  }

  return file;
}

function saveCacheFile<TCacheContent>(
  cacheDir: string,
  args: CompilerCacheSetItemArgs<TCacheContent>,
): void {
  if (args.persistent === false) return;

  const filePath = getCacheFilePath(cacheDir, args);

  const cacheFile: CompilerCacheFile<TCacheContent> = {
    filePath: args.filePath,
    contentHash: args.contentHash,
    cacheContent: args.cacheContent,
    cacheType: args.cacheType,
  };

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cacheFile), 'utf8');
  } catch {
    // cache writes are best-effort
    // a failed cache should not fail compilation.
  }
}

function getCacheFilePath(cacheDir: string, args: CompilerCacheGetItemArgs): string {
  return path.join(cacheDir, args.cacheType, getCacheKey(args) + '.json');
}

function getCacheKey(args: CompilerCacheGetItemArgs): string {
  return crypto
    .createHash('md5')
    .update(args.cacheType)
    .update('\0')
    .update(path.resolve(args.filePath))
    .digest('hex');
}
