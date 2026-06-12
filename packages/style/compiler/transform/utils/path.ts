import path from 'node:path';
import { normalizePath } from '../../utils/path';

export function getProjectFileId(projectDir: string, filePath: string | null | undefined) {
  if (!filePath) return 'unknown';

  const relativePath = path.relative(projectDir, filePath);

  if (relativePath && !path.isAbsolute(relativePath)) {
    filePath = relativePath;
  }

  return normalizePath(filePath);
}
