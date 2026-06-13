import { createStyleFn, type CSSProperties, selectorPriority, Selectors, styleTransform, type } from '@fluentic/style';

export type FlexShorthand = {
  row?: boolean;
  column?: boolean;
};

export type CustomStyle = CSSProperties & FlexShorthand;

const selectors = selectorPriority(
  {
    hover: Selectors.hover,
    active: Selectors.active,
    media: Selectors.media,
  },
  ['hover', 'active'],
);

export const { style } = createStyleFn({
  style: type<CustomStyle>,
  selectors,
  transform: styleTransform<CustomStyle>({
    transform({ row, column, ...rest }) {
      if (row) rest.flexDirection = 'row';
      if (column) rest.flexDirection = 'column';
      return rest;
    },
  }),
});
