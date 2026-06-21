import { createElement as reactCreateElement } from 'react';
import * as react from 'react/jsx-dev-runtime';
import { transformElement } from '../../runtime/rsc/jsx';
import { createJsxDEV, wrapCreateElement, wrapFragment } from '../utils';

export type { JSX } from 'react/jsx-dev-runtime';

export const createElement = wrapCreateElement(reactCreateElement, transformElement);

export const Fragment = wrapFragment(react.Fragment);
export const jsxDEV = createJsxDEV(react.jsxDEV, transformElement);
