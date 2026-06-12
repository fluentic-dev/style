import * as data from './type_maps';
import type { PropertyTypeRecord } from './types';

export const PropertyTypes = data;

export const DefaultPropertyTypes: PropertyTypeRecord = {
  ...data.animation,
  ...data.background,
  ...data.border,
  ...data.columns,
  ...data.containIntrinsicSize,
  ...data.container,
  ...data.flex,
  ...data.font,
  ...data.gap,
  ...data.grid,
  ...data.inset,
  ...data.listStyle,
  ...data.margin,
  ...data.mask,
  ...data.offset,
  ...data.outline,
  ...data.overflow,
  ...data.overscrollBehavior,
  ...data.padding,
  ...data.place,
  ...data.scrollMargin,
  ...data.scrollPadding,
  ...data.scrollTimeline,
  ...data.text,
  ...data.transition,
  ...data.viewTimeline,
  ...data.whiteSpace,
};
