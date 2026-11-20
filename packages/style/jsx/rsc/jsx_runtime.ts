import { createElement as reactCreateElement } from 'react';
import * as react from 'react/jsx-runtime';
import { withGlobalSheetPayload } from '../../runtime/rsc/globalSheet';
import { transformElement } from '../../runtime/rsc/jsx';
import { createJsx, wrapCreateElement, wrapFragment } from '../utils';

export type { JSX } from 'react/jsx-runtime';

export const createElement = wrapCreateElement(
  ((...args: Parameters<typeof reactCreateElement>) =>
    withGlobalSheetPayload(reactCreateElement(...args), args[0])) as typeof reactCreateElement,
  transformElement,
);

export const Fragment = wrapFragment(react.Fragment);
export const jsx = createJsx(
  (type, props, key) => withGlobalSheetPayload(react.jsx(type, props, key), type),
  transformElement,
);
export const jsxs = createJsx(
  (type, props, key) => withGlobalSheetPayload(react.jsxs(type, props, key), type),
  transformElement,
);
