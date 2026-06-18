import type {
  ClassNameFormat,
  ClassNameInfo,
  ScopeClassNameFormat,
  ScopeClassNameInfo,
} from '../../../config/types';
import { createNameFormatter } from '../../utils/format';

export const CLASS_NAME_FORMAT = '[(atRule)-][(scopeSelector)-](property)[-(selector)][-(value)]-$hash';

export const SCOPE_CLASS_NAME_FORMAT = '-(className)';

export const formatClassName = createNameFormatter<ClassNameInfo>([
  'atRule',
  'scopeSelector',
  'property',
  'selector',
  'value',
]);

export const formatScopeClassName = createNameFormatter<ScopeClassNameInfo>([
  'className',
]);

export function getDebugClassName(
  format: ClassNameFormat | null,
  hash: string,
  info: ClassNameInfo,
) {
  return formatClassName(format || CLASS_NAME_FORMAT, hash, info);
}

export function getDebugScopeClassName(
  format: ScopeClassNameFormat | null,
  info: ScopeClassNameInfo,
) {
  return formatScopeClassName(format || SCOPE_CLASS_NAME_FORMAT, null, info);
}
