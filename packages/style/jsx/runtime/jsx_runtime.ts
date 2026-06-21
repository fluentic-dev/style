import { createElement as reactCreateElement } from 'react';
import * as react from 'react/jsx-runtime';
import { transformElement } from '../../runtime/core/jsx';
import { createJsx, wrapCreateElement, wrapFragment } from '../utils';

export type { JSX } from 'react/jsx-runtime';

export const createElement = wrapCreateElement(reactCreateElement, transformElement);

export const Fragment = wrapFragment(react.Fragment);
export const jsx = createJsx(react.jsx, transformElement);
export const jsxs = createJsx(react.jsxs, transformElement);
