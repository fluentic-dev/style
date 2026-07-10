import { CSS_CONFIG } from '../config/config/css';
import type { VarNameFormat, VarNameInfo } from '../config/types';
import { createNameFormatter } from './utils/format';
import { getIdentifierSafeHash } from './utils/hash';

export const VAR_NAME_FORMAT = 'var[-(name)]-$hash';

export const formatVarName = createNameFormatter<VarNameInfo>(['name']);

export function getLocalVarName(
  filePath: string,
  line: number,
  column: number,
  format: VarNameFormat | null | undefined,
) {
  const hash = getIdentifierSafeHash(filePath + '\n' + line + ':' + column, CSS_CONFIG.hashLength);
  const name = formatVarName(format || VAR_NAME_FORMAT, hash, { name: '' });

  return '--' + name;
}
