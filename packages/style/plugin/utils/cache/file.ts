import fs from 'node:fs';
import path from 'node:path';
import type { PluginCompiler } from '../compiler';

export function getPluginCacheFilePath(
  compiler: PluginCompiler,
  fileName: string,
) {
  return path.join(compiler.cacheDir, fileName);
}

export function writeCacheFile(
  cacheDir: string,
  fileName: string,
  content: string,
) {
  const filePath = path.join(cacheDir, fileName);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');

  return filePath;
}

export function writePluginCacheFile(
  compiler: PluginCompiler,
  fileName: string,
  content: string,
) {
  return writeCacheFile(compiler.cacheDir, fileName, content);
}
