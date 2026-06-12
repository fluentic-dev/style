import { LayerPropertyPriorities } from '../layer';

export const LONGHAND = LayerPropertyPriorities.longhand;
export const SHORTHAND = LayerPropertyPriorities.shorthand;
export const INTERMEDIATE = LayerPropertyPriorities.intermediate;

export type PropertyTypeRecord<T extends string = string> = Partial<Record<T, number>>;
