import { getNamedToken } from '../../dialect';
import { isStyleTokenData } from '../../style/token';
import { styleTransform } from '../../style/transform';
import type { CSSProperties } from '../../style/types';
import { defaultTailwindTheme } from './theme';
import type {
  MergeTailwindTheme,
  TailwindDefaultTheme,
  TailwindExtendedStyle,
  TailwindScale,
  TailwindStyle,
  TailwindStyleConfig,
  TailwindStyleTransformOptions,
  TailwindTheme,
} from './types';

type CssOutput = Record<string, unknown>;
type UtilityResolver<Theme extends TailwindTheme> = (
  value: unknown,
  css: CssOutput,
  theme: Theme,
) => void;

export function createTailwindStyleTransform<const Theme extends TailwindTheme = TailwindTheme>(
  config: TailwindStyleConfig<Theme> = createTailwindStyleConfig({}),
) {
  return createTailwindTransform<TailwindStyle<Theme>, Theme>(config);
}

export function createTailwindExtendedStyleTransform<const Theme extends TailwindTheme = TailwindTheme>(
  config: TailwindStyleConfig<Theme> = createTailwindStyleConfig({}),
) {
  return createTailwindTransform<TailwindExtendedStyle<Theme>, Theme>(config);
}

function createTailwindTransform<Style, Theme extends TailwindTheme>(
  config: TailwindStyleConfig<Theme>,
) {
  const theme = config.theme;

  const utilities = createTailwindUtilities<Theme>();

  return styleTransform<Style>({
    transform(style) {
      const css: CssOutput = {};

      for (const property in style) {
        const value = style[property as keyof typeof style];
        const utility = utilities[property];

        if (utility) {
          utility(value, css, theme);
          continue;
        }

        css[property] = value;
      }

      return css as CSSProperties;
    },
  });
}

const { colors: _defaultTailwindColors, ...defaultTailwindNonColorTheme } = defaultTailwindTheme;

export const defaultTailwindStyleConfig = {
  theme: defaultTailwindNonColorTheme,
} as TailwindStyleConfig<TailwindDefaultTheme>;

export function createTailwindStyleConfig<const Theme extends TailwindTheme>(
  options: TailwindStyleTransformOptions<Theme>,
): TailwindStyleConfig<Theme> {
  return {
    theme: options.theme ?? ({} as Theme),
  };
}

export function createDefaultedTailwindStyleConfig<const Theme extends TailwindTheme>(
  options: TailwindStyleTransformOptions<Theme>,
): TailwindStyleConfig<MergeTailwindTheme<TailwindDefaultTheme, Theme>> {
  return mergeTailwindStyleConfig(
    defaultTailwindStyleConfig,
    createTailwindStyleConfig(options),
  ) as TailwindStyleConfig<MergeTailwindTheme<TailwindDefaultTheme, Theme>>;
}

export function mergeTailwindStyleConfig<
  const BaseTheme extends TailwindTheme,
  const OverrideTheme extends TailwindTheme,
>(
  base: TailwindStyleConfig<BaseTheme>,
  override: TailwindStyleConfig<OverrideTheme>,
): TailwindStyleConfig<BaseTheme & OverrideTheme> {
  return {
    theme: mergeTailwindTheme(base.theme, override.theme) as BaseTheme & OverrideTheme,
  };
}

function mergeTailwindTheme(
  base: TailwindTheme,
  override: TailwindTheme,
): TailwindTheme {
  return {
    ...base,
    ...override,
    spacing: mergeScale(base.spacing, override.spacing),
    colors: mergeScale(base.colors, override.colors),
    radii: mergeScale(base.radii, override.radii),
    fontSizes: mergeScale(base.fontSizes, override.fontSizes),
    fontWeights: mergeScale(base.fontWeights, override.fontWeights),
    lineHeights: mergeScale(base.lineHeights, override.lineHeights),
    letterSpacings: mergeScale(base.letterSpacings, override.letterSpacings),
    shadows: mergeScale(base.shadows, override.shadows),
    sizes: mergeScale(base.sizes, override.sizes),
    zIndices: mergeScale(base.zIndices, override.zIndices),
    opacity: mergeScale(base.opacity, override.opacity),
  };
}

function mergeScale(
  base: TailwindScale | undefined,
  override: TailwindScale | undefined,
): TailwindScale | undefined {
  if (!override) return base;
  if (!base || !isMergeableScale(base)) return override;
  if (!isMergeableScale(override)) return [override, base] as unknown as TailwindScale;

  return {
    ...base,
    ...override,
  };
}

function isMergeableScale(scale: TailwindScale): boolean {
  return !!scale && typeof scale === 'object' && !Array.isArray(scale);
}

function createTailwindUtilities<Theme extends TailwindTheme>(): Record<string, UtilityResolver<Theme>> {
  return {
    block: displayUtility('block'),
    inlineBlock: displayUtility('inline-block'),
    inlineFlex: displayUtility('inline-flex'),
    grid: displayUtility('grid'),
    hidden: displayUtility('none'),
    flex: flexUtility,

    direction: mapUtility('flexDirection', {
      row: 'row',
      rowReverse: 'row-reverse',
      col: 'column',
      colReverse: 'column-reverse',
    }),
    wrap: mapUtility('flexWrap', {
      true: 'wrap',
      reverse: 'wrap-reverse',
    }),
    items: mapUtility('alignItems', alignmentMap),
    justify: mapUtility('justifyContent', justifyMap),
    content: mapUtility('alignContent', justifyMap),
    self: mapUtility('alignSelf', alignmentMap),

    p: scaleUtility('spacing', 'padding'),
    px: scaleUtility('spacing', 'paddingInline'),
    py: scaleUtility('spacing', 'paddingBlock'),
    pt: scaleUtility('spacing', 'paddingTop'),
    pr: scaleUtility('spacing', 'paddingRight'),
    pb: scaleUtility('spacing', 'paddingBottom'),
    pl: scaleUtility('spacing', 'paddingLeft'),
    ps: scaleUtility('spacing', 'paddingInlineStart'),
    pe: scaleUtility('spacing', 'paddingInlineEnd'),

    m: scaleUtility('spacing', 'margin'),
    mx: scaleUtility('spacing', 'marginInline'),
    my: scaleUtility('spacing', 'marginBlock'),
    mt: scaleUtility('spacing', 'marginTop'),
    mr: scaleUtility('spacing', 'marginRight'),
    mb: scaleUtility('spacing', 'marginBottom'),
    ml: scaleUtility('spacing', 'marginLeft'),
    ms: scaleUtility('spacing', 'marginInlineStart'),
    me: scaleUtility('spacing', 'marginInlineEnd'),

    gap: scaleUtility('spacing', 'gap'),
    gapX: scaleUtility('spacing', 'columnGap'),
    gapY: scaleUtility('spacing', 'rowGap'),

    w: sizeUtility('width'),
    minW: sizeUtility('minWidth'),
    maxW: sizeUtility('maxWidth'),
    h: sizeUtility('height'),
    minH: sizeUtility('minHeight'),
    maxH: sizeUtility('maxHeight'),
    size: sizePairUtility,

    bg: colorUtility('backgroundColor'),
    text: textUtility,
    borderColor: colorUtility('borderColor'),
    outlineColor: colorUtility('outlineColor'),
    ringColor: colorUtility('--tw-ring-color'),

    textSize: scaleUtility('fontSizes', 'fontSize'),
    font: scaleUtility('fontWeights', 'fontWeight'),
    leading: scaleUtility('lineHeights', 'lineHeight'),
    tracking: scaleUtility('letterSpacings', 'letterSpacing'),
    align: propertyUtility('textAlign'),

    rounded: scaleUtility('radii', 'borderRadius'),
    roundedT: multiScaleUtility('radii', ['borderTopLeftRadius', 'borderTopRightRadius']),
    roundedR: multiScaleUtility('radii', ['borderTopRightRadius', 'borderBottomRightRadius']),
    roundedB: multiScaleUtility('radii', ['borderBottomRightRadius', 'borderBottomLeftRadius']),
    roundedL: multiScaleUtility('radii', ['borderTopLeftRadius', 'borderBottomLeftRadius']),
    roundedTl: scaleUtility('radii', 'borderTopLeftRadius'),
    roundedTr: scaleUtility('radii', 'borderTopRightRadius'),
    roundedBr: scaleUtility('radii', 'borderBottomRightRadius'),
    roundedBl: scaleUtility('radii', 'borderBottomLeftRadius'),

    shadow: scaleUtility('shadows', 'boxShadow'),
    opacity: scaleUtility('opacity', 'opacity'),
    z: scaleUtility('zIndices', 'zIndex'),

    relative: positionUtility('relative'),
    absolute: positionUtility('absolute'),
    fixed: positionUtility('fixed'),
    sticky: positionUtility('sticky'),
    inset: scaleUtility('spacing', 'inset'),
    insetX: multiScaleUtility('spacing', ['left', 'right']),
    insetY: multiScaleUtility('spacing', ['top', 'bottom']),
    top: scaleUtility('spacing', 'top'),
    right: scaleUtility('spacing', 'right'),
    bottom: scaleUtility('spacing', 'bottom'),
    left: scaleUtility('spacing', 'left'),

    select: mapUtility('userSelect', {
      none: 'none',
      text: 'text',
      all: 'all',
      auto: 'auto',
    }),
    pointerEvents: mapUtility('pointerEvents', {
      none: 'none',
      auto: 'auto',
    }),
    cursor: propertyUtility('cursor'),
    overflow: propertyUtility('overflow'),
    overflowX: propertyUtility('overflowX'),
    overflowY: propertyUtility('overflowY'),
  };
}

const alignmentMap = {
  auto: 'auto',
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  baseline: 'baseline',
  stretch: 'stretch',
};

const justifyMap = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
  stretch: 'stretch',
};

function displayUtility(display: CSSProperties['display']): UtilityResolver<TailwindTheme> {
  return (value, css) => {
    if (value) css.display = display;
  };
}

function flexUtility(value: unknown, css: CssOutput) {
  if (value === true) {
    css.display = 'flex';
    return;
  }

  if (value !== false && value !== undefined) {
    css.flex = value;
  }
}

function positionUtility(position: CSSProperties['position']): UtilityResolver<TailwindTheme> {
  return (value, css) => {
    if (value) css.position = position;
  };
}

function propertyUtility(property: keyof CSSProperties): UtilityResolver<TailwindTheme> {
  return (value, css) => {
    if (value !== undefined) css[property] = value;
  };
}

function scaleUtility<Theme extends TailwindTheme>(
  scaleName: keyof TailwindTheme,
  property: string,
): UtilityResolver<Theme> {
  return (value, css, theme) => {
    if (value !== undefined) css[property] = resolveScale(theme[scaleName], value);
  };
}

function colorUtility(property: string): UtilityResolver<TailwindTheme> {
  return (value, css, theme) => {
    if (value !== undefined) css[property] = resolveScale(theme.colors, value);
  };
}

function textUtility(value: unknown, css: CssOutput, theme: TailwindTheme) {
  if (value === undefined) return;

  if (typeof value === 'string' && textAlignValues.has(value)) {
    css.textAlign = value;
    return;
  }

  const fontSize = resolveScale(theme.fontSizes, value);
  if (fontSize !== value) {
    css.fontSize = fontSize;
    return;
  }

  css.color = resolveScale(theme.colors, value);
}

function sizeUtility(property: string): UtilityResolver<TailwindTheme> {
  return (value, css, theme) => {
    if (value !== undefined) css[property] = resolveSize(property, theme, value);
  };
}

function sizePairUtility(value: unknown, css: CssOutput, theme: TailwindTheme) {
  if (value === undefined) return;

  const resolved = resolveScales([theme.sizes, theme.spacing], value);
  css.width = resolved;
  css.height = resolved;
}

function resolveSize(property: string, theme: TailwindTheme, value: unknown) {
  if (isHeightProperty(property) && value === '$screen') return '100vh';
  return resolveScales([theme.sizes, theme.spacing], value);
}

function isHeightProperty(property: string) {
  return property === 'height' || property === 'minHeight' || property === 'maxHeight';
}

function multiScaleUtility(
  scaleName: keyof TailwindTheme,
  properties: string[],
): UtilityResolver<TailwindTheme> {
  return (value, css, theme) => {
    if (value === undefined) return;

    const resolved = resolveScale(theme[scaleName], value);
    for (let i = 0; i < properties.length; i++) {
      css[properties[i]] = resolved;
    }
  };
}

function mapUtility(property: string, values: Record<string, unknown>): UtilityResolver<TailwindTheme> {
  return (value, css) => {
    if (value === undefined) return;

    const key = String(value);
    css[property] = key in values ? values[key] : value;
  };
}

function resolveScale(scale: TailwindScale | undefined, value: unknown) {
  if (!scale || isStyleTokenData(value)) return value;
  if (Array.isArray(scale)) return resolveScales(scale, value);

  const key = getScaleRef(value);
  if (key === null) return value;

  const token = getNamedToken(scale, value as string);
  if (token) return token;

  const resolved = getScaleValue(scale, key);
  if (resolved.found) return resolved.value;

  return value;
}

function resolveScales(scales: (TailwindScale | undefined)[], value: unknown) {
  if (isStyleTokenData(value)) return value;

  const key = getScaleRef(value);
  if (key === null) return value;

  for (let i = 0; i < scales.length; i++) {
    const scale = scales[i];
    if (!scale) continue;

    const token = getNamedToken(scale, value as string);
    if (token) return token;

    const resolved = getScaleValue(scale, key);
    if (resolved.found) return resolved.value;
  }

  return value;
}

function getScaleValue(scale: TailwindScale, key: string) {
  if (key in scale) return { found: true, value: scale[key] };

  const path = key.split('.');
  let current: unknown = scale;

  for (let i = 0; i < path.length; i++) {
    if (!current || typeof current !== 'object') return { found: false, value: undefined };
    if (!(path[i] in current)) return { found: false, value: undefined };
    current = (current as Record<string, unknown>)[path[i]];
  }

  return { found: true, value: current };
}

function getScaleRef(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('$')) return null;
  return value.slice(1);
}

const textAlignValues = new Set(['left', 'center', 'right', 'justify', 'start', 'end']);
