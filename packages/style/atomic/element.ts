import { CSS_CONFIG } from '../config/config/css';
import { DEV_CONFIG } from '../config/config/dev';
import type { ElementClassNameFormat, ElementClassNameInfo } from '../config/types';
import { escapeCssIdent } from './utils/cssIdent';
import { sanitizeDebugName } from './utils/debug';
import { createNameFormatter } from './utils/format';
import { getIdentifierSafeHash } from './utils/hash';

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
  const hash = getIdentifierSafeHash(id, DEV_CONFIG.hashLength ?? CSS_CONFIG.hashLength ?? 3);

  return formatElementClassName(
    elementClassNameFormat || ELEMENT_CLASS_NAME_FORMAT,
    hash,
    { name },
  );
}

export function getElementMarkerRuleCss(className: string) {
  return `.${escapeCssIdent(className)}{--fluentic-element-marker:0}`;
}
