import { createElement as reactCreateElement } from 'react';
import * as react from 'react/jsx-dev-runtime';
import { withGlobalSheetPayload } from '../../runtime/rsc/globalSheet';
import { transformElement } from '../../runtime/rsc/jsx';
import { createJsxDEV, wrapCreateElement, wrapFragment } from '../utils';

export type { JSX } from 'react/jsx-dev-runtime';

export const createElement = wrapCreateElement(
  ((...args: Parameters<typeof reactCreateElement>) =>
    withGlobalSheetPayload(reactCreateElement(...args), args[0])) as typeof reactCreateElement,
  transformElement,
);

export const Fragment = wrapFragment(react.Fragment);
export const jsxDEV = createJsxDEV(
  (type, props, key, isStatic, source, self) =>
    withGlobalSheetPayload(react.jsxDEV(type, props, key, isStatic, source, self), type),
  transformElement,
);
