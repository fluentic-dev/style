import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { compareLayerPriority } from '../../../atomic/layer';
import { type CompilerExtractCssArgs, type CssExtractRule, extractCss } from '../../../compiler/extract';
import { normalizePath } from '../../../compiler/utils/path';

export type FileCssCacheRule = CssExtractRule;

export type FileCssCacheRecord = {
  filePath: string;
  contentHash: string;
  configHash: string;
  rules: FileCssCacheRule[];
  updatedAt: number;
};

export type SetFileCssArgs = {
  filePath: string;
  contentHash: string;
  configHash: string;
  rules: FileCssCacheRule[];
};

export type GetFileCssArgs = CompilerExtractCssArgs & {
  configHash?: string;
};

export type FileCssCacheArgs = {
  cacheDir: string;
  cacheSubdir: string;
};

export type FileCssCache = ReturnType<typeof createFileCssCache>;

export function createFileCssCache(args: FileCssCacheArgs) {
  const rootDir = path.join(args.cacheDir, args.cacheSubdir);
  const filesDir = path.join(rootDir, 'files');

  const getFilePath = (filePath: string) => {
    return path.join(filesDir, hashFilePath(filePath) + '.json');
  };

  const setFileCss = (item: SetFileCssArgs) => {
    const record: FileCssCacheRecord = {
      filePath: normalizePath(item.filePath),
      contentHash: item.contentHash,
      configHash: item.configHash,
      rules: item.rules,
      updatedAt: Date.now(),
    };

    fs.mkdirSync(filesDir, { recursive: true });

    fs.writeFileSync(getFilePath(record.filePath), JSON.stringify(record), 'utf8');
  };

  const getCss = (args: GetFileCssArgs = {}) => {
    const rules = getRules(args);
    return extractCss(rules, args);
  };

  const getRules = (args: GetFileCssArgs = {}) => {
    const records = readRecords(filesDir, args);
    const rules: FileCssCacheRule[] = [];

    for (const record of records) {
      rules.push(...record.rules);
    }

    return rules.sort((a, b) => compareLayerPriority(a.priority, b.priority));
  };

  const clear = () => {
    try {
      fs.rmSync(rootDir, { recursive: true, force: true });
    } catch {
      // Cache cleanup is best effort.
    }
  };

  const invalidateFile = (filePath: string) => {
    try {
      fs.rmSync(getFilePath(normalizePath(filePath)));
    } catch {
      // Cache invalidation is best effort.
    }
  };

  return {
    rootDir,
    filesDir,
    setFileCss,
    getCss,
    getRules,
    clear,
    invalidateFile,
  };
}

export function createFileCssContentHash(code: string) {
  return hash(code);
}

export function createFileCssConfigHash(config: unknown) {
  return hash(JSON.stringify(config ?? null));
}

function readRecords(filesDir: string, args: GetFileCssArgs) {
  let entries: string[];

  try {
    entries = fs.readdirSync(filesDir);
  } catch {
    return [];
  }

  const records: FileCssCacheRecord[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;

    try {
      const record = JSON.parse(
        fs.readFileSync(path.join(filesDir, entry), 'utf8'),
      ) as FileCssCacheRecord;

      if (!record.filePath || !Array.isArray(record.rules)) continue;
      if (args.configHash && record.configHash !== args.configHash) continue;

      records.push(record);
    } catch {
      // Ignore partial cache files from interrupted dev builds.
    }
  }

  return records;
}

function hashFilePath(filePath: string) {
  return hash(normalizePath(path.resolve(filePath)));
}

function hash(text: string) {
  return createHash('sha256').update(text).digest('hex');
}
