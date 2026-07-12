import type {
  ClassNameFormat,
  ClassNameInfo,
  TransformClassNameFormat,
  TransformClassNameInfo,
} from '../../../config/types';
import { createNameFormatter } from '../../utils/format';

export const CLASS_NAME_FORMAT = '[(atRule)-][(scopeSelector)-](property)[-(selector)][-(value)]--$hash';

export const TRANSFORM_CLASS_NAME_FORMAT = '(className)--$hash';

export const formatClassName = createNameFormatter<ClassNameInfo>([
  'atRule',
  'scopeSelector',
  'property',
  'selector',
  'value',
]);

export const formatTransformClassName = createNameFormatter<TransformClassNameInfo>([
  'className',
]);

export function getDebugClassName(
  format: ClassNameFormat | null,
  hash: string,
  info: ClassNameInfo,
) {
  return formatClassName(format || CLASS_NAME_FORMAT, hash, info);
}

export function getDebugTransformClassName(
  format: TransformClassNameFormat | null,
  hash: string,
  info: TransformClassNameInfo,
) {
  return formatTransformClassName(format || TRANSFORM_CLASS_NAME_FORMAT, hash, info);
}
