import { getRelativePath, isAbsolutePath, normalizePath } from '../../utils/path';

export function getProjectFileId(projectDir: string, filePath: string | null | undefined) {
  if (!filePath) return 'unknown';

  const relativePath = getRelativePath(projectDir, filePath);

  if (relativePath && !isAbsolutePath(relativePath)) {
    filePath = relativePath;
  }

  return normalizePath(filePath);
}
