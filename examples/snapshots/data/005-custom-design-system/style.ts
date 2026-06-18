import {
  createStyleFn,
  styleTransform,
  type,
  type CSSProperties,
} from '@fluentic/style';
import { assertEnumSelector, MinimalSelectors, selector, selectorPriority } from '@fluentic/style/selector';

type AppStyle = CSSProperties;

type LayoutStyle = CSSProperties & {
  row?: boolean;
  column?: boolean;
  center?: boolean;
  gapX?: CSSProperties['columnGap'];
  gapY?: CSSProperties['rowGap'];
};

type UiStyle = CSSProperties & {
  elevated?: boolean;
  pill?: boolean;
};

const baseAppSelectors = {
  ...MinimalSelectors,
  focusVisible: selector(':focus-visible'),
  pressed: selector('[aria-pressed="true"]'),
};

const appSelectors = selectorPriority(baseAppSelectors, [
  'hover',
  'focusVisible',
  'pressed',
  'active',
  'disabled',
]);

const responsiveSelectors = {
  md: selector('@media (768px <= width < 1024px)', 'media'),
  lg: selector('@media (1024px <= width < 1280px)', 'media'),
};

const baseUiSelectors = {
  hover: selector(':hover'),
  pressed: selector('[aria-pressed="true"]'),
  tone: selector('[data-tone="$"]', assertEnumSelector('brand', 'success', 'danger')),
};

const uiSelectors = selectorPriority(baseUiSelectors, [
  'hover',
  'pressed',
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

export const snapshotImportSources = [
  { source: './style', name: 'style', styleFn: style },
  { source: './style', name: 'sx', styleFn: sx },
  { source: './style', name: 'ui', styleFn: ui },
];
