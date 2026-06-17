import { createTransformElement } from '../core/createTransformElement';
import { getClassName } from './getClassName';

export const transformElement = createTransformElement(getClassName);
