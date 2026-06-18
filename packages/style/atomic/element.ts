import type { ElementClassNameFormat, ElementClassNameInfo } from '../config/types';
import { escapeCssIdent, getIdentifierSafeHash } from './utils/css';
import { sanitizeDebugName } from './utils/debug';
import { createNameFormatter } from './utils/format';

export const ELEMENT_CLASS_NAME_FORMAT = '@(name)';

export const formatElementClassName = createNameFormatter<ElementClassNameInfo>([
  'name',
]);

export function getElementClassName(
  label: string | undefined,
  id: string,
  elementClassNameFormat: ElementClassNameFormat | null,
) {
  const name = sanitizeDebugName(label) || null;
  const hash = getIdentifierSafeHash(id);

  return formatElementClassName(
    elementClassNameFormat || ELEMENT_CLASS_NAME_FORMAT,
    hash,
    { name },
  );
}

export function getElementMarkerRuleCss(className: string) {
  return `.${escapeCssIdent(className)}{--fluentic-element-marker:0}`;
}
