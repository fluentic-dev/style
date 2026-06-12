import { createStyleFn, type CSSProperties, selectorPriority, styleTransform, type } from '@fluentic/style';
import { Selectors } from '@fluentic/style/server';

export type ExtraStyle = {
  row?: boolean;
  column?: boolean;
};

export type CustomStyle = CSSProperties & ExtraStyle;

const customSelectors = {
  onHover: Selectors.hover,
  onActive: Selectors.active,
  firstChild: Selectors.firstChild,
  media: Selectors.media,
};

const prioritySelectors = selectorPriority(customSelectors, [
  'onHover',
  'onActive', // have active always win hover
]);

const transform = styleTransform<CustomStyle>({
  transform(style) {
    const { row, column, ...rest } = style;

    if (row) {
      rest.flexDirection = 'row';
    } else if (column) {
      rest.flexDirection = 'column';
    }

    return rest;
  },
});

export const { style } = createStyleFn({
  style: type<CustomStyle>,
  selectors: prioritySelectors,
  transform,
});
