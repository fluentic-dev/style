import { createStyleFn, type CSSProperties, styleTransform, type } from '@fluentic/style';
import { assertEnumSelector, MinimalSelectors, selector, selectorPriority } from '@fluentic/style/selector';

export type AppStyle = CSSProperties;

export type LayoutStyle = CSSProperties & {
  row?: boolean;
  column?: boolean;
  center?: boolean;
  gapX?: CSSProperties['columnGap'];
  gapY?: CSSProperties['rowGap'];
};

export type UiStyle = CSSProperties & {
  elevated?: boolean;
  pill?: boolean;
};

const baseAppSelectors = {
  ...MinimalSelectors,
  focusVisible: selector(':focus-visible'),
  selected: selector('[aria-selected="true"]'),
  pressed: selector('[aria-pressed="true"]'),
};

const appSelectors = selectorPriority(baseAppSelectors, [
  'hover',
  'focusVisible',
  'pressed',
  'selected',
  'active',
  'disabled',
]);

const responsiveSelectors = {
  sm: selector('@media (480px <= width < 768px)', 'media'),
  md: selector('@media (768px <= width < 1024px)', 'media'),
  lg: selector('@media (1024px <= width < 1280px)', 'media'),
  xl: selector('@media (min-width: 1280px)', 'media'),
};

const baseUiSelectors = {
  hover: selector(':hover'),
  focusVisible: selector(':focus-visible'),
  pressed: selector('[aria-pressed="true"]'),
  selected: selector('[aria-selected="true"]'),
  tone: selector('[data-tone="$"]', assertEnumSelector('brand', 'success', 'danger')),
};

const uiSelectors = selectorPriority(baseUiSelectors, [
  'hover',
  'focusVisible',
  'pressed',
  'selected',
]);

const layoutTransform = styleTransform<LayoutStyle>({
  transform(style) {
    const { row, column, center, gapX, gapY, ...css } = style;

    if (row || column) {
      css.display = 'flex';
      css.flexDirection = row ? 'row' : 'column';
    }

    if (center) {
      css.alignItems = 'center';
      css.justifyContent = 'center';
    }

    if (gapX !== undefined) css.columnGap = gapX;
    if (gapY !== undefined) css.rowGap = gapY;

    return css;
  },
});

const uiTransform = styleTransform<UiStyle>({
  transform(style) {
    const { elevated, pill, ...css } = style;

    if (elevated) {
      css.boxShadow = '0 18px 44px rgba(15, 23, 42, 0.12)';
    }

    if (pill) {
      css.borderRadius = 999;
    }

    return css;
  },
});

export const { style } = createStyleFn({
  style: type<AppStyle>,
  selectors: appSelectors,
});

export const { style: sx } = createStyleFn({
  style: type<LayoutStyle>,
  selectors: responsiveSelectors,
  transform: layoutTransform,
});

export const { style: ui } = createStyleFn({
  style: type<UiStyle>,
  selectors: uiSelectors,
  transform: uiTransform,
});
