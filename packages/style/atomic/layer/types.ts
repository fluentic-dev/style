import { LayerPlaceholder } from '../../config';

export { LayerPlaceholder };

export const LayerDefaultLayers = [LayerPlaceholder];
export const LayerDefaultNamespace = 'css';

export const LayerDefaultPriority: LayerPriority = [0, 0, 0, 0, 0, 0, 0];

export const LayerMediaPriorities = {
  base: 0,
  media: 1,
  priorityMedia: 2,
};

export const LayerSelectorPriorities = {
  base: 0,
  parentSelector: 1,
  selector: 2,
  prioritySelector: 3,
};

export const LayerPropertyPriorities = {
  shorthand: 0,
  intermediate: 1,
  longhand: 2,
};

export type LayerPriority = readonly [
  value: number,
  selector: number,
  parentSelector: number,
  media: number,
  atRule: number,
  origin: number,
  property: number,
];
