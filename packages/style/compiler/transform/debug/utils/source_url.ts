import type { CompilerOptions } from '../../../compiler';
import { getRelativePath } from '../../../utils/path';
import { getDefaultSourcemapUrl, normalizeSourcemapSourcePath } from '../../../utils/sourcemap';

export function getDebugSourceUrl(
  filePath: string,
  _sourceUrl: string | null,
  projectDir: string,
  options: CompilerOptions,
) {
  const relativePath = getRelativePath(projectDir, filePath);
  const sourcePath = normalizeSourcemapSourcePath(relativePath);
  const defaultSourceUrl = getDefaultSourcemapUrl({
    absolutePath: filePath,
    relativePath,
    sourcePath,
  });

  const url = options.getSourcemapFilePath?.({
    filePath: filePath,
    absolutePath: filePath,
    relativePath,
    sourcePath,
    projectDir,
    sourceUrl: defaultSourceUrl,
  });

  return url || defaultSourceUrl;
}
