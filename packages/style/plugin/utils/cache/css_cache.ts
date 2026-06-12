import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { CssExtractRule } from '../../../compiler/extract';
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

export type GetFileCssArgs = {
  configHash?: string;
};

export type FileCssCacheArgs = {
  cacheDir: string;
  namespace: string;
};

export type FileCssCache = ReturnType<typeof createFileCssCache>;

export function createFileCssCache(args: FileCssCacheArgs) {
  const rootDir = path.join(args.cacheDir, args.namespace);
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
    const seen = new Set<string>();
    const css: string[] = [];

    for (const rule of rules) {
      const key = rule.className;
      if (!key || seen.has(key)) continue;

      seen.add(key);
      css.push(rule.css);
    }

    return css.join('\n');
  };

  const getRules = (args: GetFileCssArgs = {}) => {
    const records = readRecords(filesDir, args);
    const rules: FileCssCacheRule[] = [];

    records.sort((a, b) => a.filePath.localeCompare(b.filePath));

    for (const record of records) {
      rules.push(...record.rules);
    }

    return rules;
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
