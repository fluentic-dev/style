export const LayerPlaceholder = '$layer';

export const LayerDefaultNamespace = 'css';

export const LayerDefaultPriority: LayerPriority = [0, 0, 0, 0, 0, 0, 0];

export const LayerGroups = {
  base: 0,
  parentSelector: 1,
  media: 2,
  selector: 3,
  mediaSelector: 4,
};

export const LayerPropertyPriorities = {
  shorthand: 0,
  intermediate: 1,
  longhand: 2,
};

export type LayerPriority = readonly [
  explicit: number,
  group: number,
  selector: number,
  parentSelector: number,
  atRule: number,
  origin: number,
  property: number,
];
