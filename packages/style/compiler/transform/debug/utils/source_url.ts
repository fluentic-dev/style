import path from 'node:path';
import type { CompilerOptions } from '../../../compiler';
import { normalizePath } from '../../../utils/path';
import { normalizeSourcemapSourcePath } from '../../../utils/sourcemap';

export function getDebugSourceUrl(
  filePath: string,
  sourceUrl: string | null,
  projectDir: string,
  options: CompilerOptions,
) {
  const relativePath = normalizePath(path.relative(projectDir, filePath));
  const sourcePath = normalizeSourcemapSourcePath(relativePath);

  const url = options.getSourcemapFilePath?.({
    filePath: filePath,
    absolutePath: filePath,
    relativePath,
    sourcePath,
    projectDir,
    sourceUrl,
  });

  return url || sourceUrl || sourcePath || relativePath || filePath;
}
