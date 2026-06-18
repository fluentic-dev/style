import type { VarNameFormat, VarNameInfo } from '../config/types';
import { getIdentifierSafeHash } from './utils/css';
import { createNameFormatter } from './utils/format';

export const VAR_NAME_FORMAT = 'var[-(name)]-$hash';

export const formatVarName = createNameFormatter<VarNameInfo>(['name']);

export function getLocalVarName(
  filePath: string,
  line: number,
  column: number,
  format: VarNameFormat | null | undefined,
) {
  const hash = getIdentifierSafeHash(filePath + '\n' + line + ':' + column);
  const name = formatVarName(format || VAR_NAME_FORMAT, hash, { name: '' });

  return '--' + name;
}
