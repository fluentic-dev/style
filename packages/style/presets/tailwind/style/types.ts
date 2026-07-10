import type { TOKEN_ID } from '../../../style/token';
import type { CSSProperties } from '../../../style/types';
import type { TailwindTheme } from '../types';

type ScaleKey = string | number;
type TokenValue = { [TOKEN_ID]: string; };
type ScaleLeaf = TokenValue | ((...args: any[]) => unknown);
type KnownScaleKeys<Scale> = keyof NonNullable<Scale> extends infer Key
  ? Key extends ScaleKey ? string extends Key ? never
    : number extends Key ? never
    : Key
  : never
  : never;
type ScalePaths<Scale> = Scale extends unknown ? NonNullable<Scale> extends infer ResolvedScale ? {
      [Key in Extract<KnownScaleKeys<ResolvedScale>, ScaleKey>]: ResolvedScale[Key] extends ScaleLeaf ? Key
        : ResolvedScale[Key] extends Record<ScaleKey, unknown>
          ? `${Key}.${Extract<KnownScaleKeys<ResolvedScale[Key]>, ScaleKey>}`
        : Key;
    }[Extract<KnownScaleKeys<ResolvedScale>, ScaleKey>]
  : never
  : never;
type ScaleRef<Scale> = `$${Extract<ScalePaths<Scale>, ScaleKey>}`;

type CssNumericString = `${number}${string}` | `${number}`;
type CssFunctionString = `${string}(${string})`;
type CssNumericValue = CssNumericString | number;
type CssColorValue =
  | `#${string}`
  | CssFunctionString
  | 'transparent'
  | 'currentColor';
type CssKeywordValue =
  | 'auto'
  | 'none'
  | 'inherit'
  | 'initial'
  | 'unset'
  | 'revert'
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'normal'
  | 'bold'
  | 'bolder'
  | 'lighter';
type CssSizeKeywordValue = 'auto' | 'min-content' | 'max-content' | 'fit-content';
type CssLiteralValue = CssNumericValue | CssColorValue | CssKeywordValue;

export type TailwindScaleValue<Scale, LiteralValue = CssLiteralValue> =
  | ScaleRef<Scale>
  | LiteralValue
  | TokenValue;

export type TailwindSpacingValue<Theme extends TailwindTheme> = TailwindScaleValue<Theme['spacing'], CssNumericValue>;

export type TailwindColorValue<Theme extends TailwindTheme> = TailwindScaleValue<Theme['colors'], CssColorValue>;

export type TailwindRadiusValue<Theme extends TailwindTheme> = TailwindScaleValue<
  Theme['radii'],
  CssNumericValue | 'none'
>;

export type TailwindFontSizeValue<Theme extends TailwindTheme> = TailwindScaleValue<
  Theme['fontSizes'],
  CssNumericValue
>;

export type TailwindFontWeightValue<Theme extends TailwindTheme> =
  | TailwindScaleValue<Theme['fontWeights'], 'normal' | 'bold' | 'bolder' | 'lighter'>
  | number;

export type TailwindLineHeightValue<Theme extends TailwindTheme> = TailwindScaleValue<
  Theme['lineHeights'],
  CssNumericValue | 'normal'
>;

export type TailwindLetterSpacingValue<Theme extends TailwindTheme> = TailwindScaleValue<
  Theme['letterSpacings'],
  CssNumericValue
>;

export type TailwindShadowValue<Theme extends TailwindTheme> = TailwindScaleValue<
  Theme['shadows'],
  'none' | CssFunctionString
>;

export type TailwindSizeValue<Theme extends TailwindTheme> = TailwindScaleValue<
  Theme['sizes'] | Theme['spacing'],
  CssNumericValue | CssSizeKeywordValue
>;

export type TailwindOpacityValue<Theme extends TailwindTheme> =
  | TailwindScaleValue<Theme['opacity'], CssNumericValue>
  | number;

export type TailwindZIndexValue<Theme extends TailwindTheme> =
  | TailwindScaleValue<Theme['zIndices'], CssNumericValue | 'auto'>
  | number;

export type TailwindDisplayValue = boolean;
export type TailwindFlexValue = boolean | string | number;
export type TailwindDirectionValue = 'row' | 'rowReverse' | 'col' | 'colReverse';
export type TailwindWrapValue = boolean | 'reverse';
export type TailwindItemsValue = 'start' | 'end' | 'center' | 'baseline' | 'stretch';
export type TailwindJustifyValue = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly' | 'stretch';
export type TailwindContentValue = TailwindJustifyValue;
export type TailwindSelfValue = 'auto' | TailwindItemsValue;
export type TailwindTextAlignValue = 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';
export type TailwindSelectValue = 'none' | 'text' | 'all' | 'auto';
export type TailwindPointerEventsValue = 'none' | 'auto';

export type TailwindTextValue<Theme extends TailwindTheme> =
  | TailwindColorValue<Theme>
  | TailwindFontSizeValue<Theme>
  | TailwindTextAlignValue;

export type TailwindMarginValue<Theme extends TailwindTheme> = TailwindSpacingValue<Theme> | 'auto';

type TailwindResolvedValues<Theme extends TailwindTheme> = {
  spacing: TailwindSpacingValue<Theme>;
  margin: TailwindMarginValue<Theme>;
  color: TailwindColorValue<Theme>;
  radius: TailwindRadiusValue<Theme>;
  fontSize: TailwindFontSizeValue<Theme>;
  fontWeight: TailwindFontWeightValue<Theme>;
  lineHeight: TailwindLineHeightValue<Theme>;
  letterSpacing: TailwindLetterSpacingValue<Theme>;
  shadow: TailwindShadowValue<Theme>;
  size: TailwindSizeValue<Theme>;
  opacity: TailwindOpacityValue<Theme>;
  zIndex: TailwindZIndexValue<Theme>;
  text: TailwindTextValue<Theme>;
};

type TailwindNativeCssPropName =
  | 'accentColor'
  | 'appearance'
  | 'aspectRatio'
  | 'backdropFilter'
  | 'background'
  | 'backgroundImage'
  | 'backgroundPosition'
  | 'backgroundRepeat'
  | 'backgroundSize'
  | 'border'
  | 'borderBlock'
  | 'borderBlockEnd'
  | 'borderBlockStart'
  | 'borderBottom'
  | 'borderInline'
  | 'borderInlineEnd'
  | 'borderInlineStart'
  | 'borderLeft'
  | 'borderRight'
  | 'borderTop'
  | 'borderStyle'
  | 'borderWidth'
  | 'boxShadow'
  | 'boxSizing'
  | 'clipPath'
  | 'color'
  | 'columnGap'
  | 'display'
  | 'filter'
  | 'flexBasis'
  | 'flexGrow'
  | 'flexShrink'
  | 'fontFamily'
  | 'fontFeatureSettings'
  | 'fontStyle'
  | 'fontVariantNumeric'
  | 'gap'
  | 'gridAutoColumns'
  | 'gridAutoFlow'
  | 'gridAutoRows'
  | 'gridColumn'
  | 'gridColumnEnd'
  | 'gridColumnStart'
  | 'gridRow'
  | 'gridRowEnd'
  | 'gridRowStart'
  | 'gridTemplateAreas'
  | 'gridTemplateColumns'
  | 'gridTemplateRows'
  | 'height'
  | 'isolation'
  | 'justifyItems'
  | 'justifySelf'
  | 'letterSpacing'
  | 'lineClamp'
  | 'listStyle'
  | 'listStyleImage'
  | 'listStylePosition'
  | 'listStyleType'
  | 'maxHeight'
  | 'maxWidth'
  | 'minHeight'
  | 'minWidth'
  | 'objectFit'
  | 'objectPosition'
  | 'order'
  | 'outline'
  | 'outlineOffset'
  | 'outlineStyle'
  | 'outlineWidth'
  | 'placeContent'
  | 'placeItems'
  | 'placeSelf'
  | 'resize'
  | 'rotate'
  | 'rowGap'
  | 'scale'
  | 'scrollBehavior'
  | 'scrollMargin'
  | 'scrollPadding'
  | 'textDecoration'
  | 'textDecorationColor'
  | 'textDecorationLine'
  | 'textDecorationStyle'
  | 'textDecorationThickness'
  | 'textOverflow'
  | 'textTransform'
  | 'transform'
  | 'transformOrigin'
  | 'transition'
  | 'transitionDelay'
  | 'transitionDuration'
  | 'transitionProperty'
  | 'transitionTimingFunction'
  | 'translate'
  | 'verticalAlign'
  | 'visibility'
  | 'whiteSpace'
  | 'width'
  | 'willChange'
  | 'wordBreak';
type TailwindCssProperties =
  & {
    [Property in TailwindNativeCssPropName]?: CSSProperties[Property] | null;
  }
  & {
    [Property in `--${string}`]?: string | number | null | undefined;
  };

export type TailwindStyle<
  Theme extends TailwindTheme = TailwindTheme,
  Values extends TailwindResolvedValues<Theme> = TailwindResolvedValues<Theme>,
> = {
  block?: TailwindDisplayValue;
  inlineBlock?: TailwindDisplayValue;
  flex?: TailwindFlexValue;
  inlineFlex?: TailwindDisplayValue;
  grid?: TailwindDisplayValue;
  hidden?: TailwindDisplayValue;

  direction?: TailwindDirectionValue;
  wrap?: TailwindWrapValue;
  items?: TailwindItemsValue;
  justify?: TailwindJustifyValue;
  content?: TailwindContentValue;
  self?: TailwindSelfValue;

  p?: Values['spacing'];
  px?: Values['spacing'];
  py?: Values['spacing'];
  pt?: Values['spacing'];
  pr?: Values['spacing'];
  pb?: Values['spacing'];
  pl?: Values['spacing'];
  ps?: Values['spacing'];
  pe?: Values['spacing'];

  m?: Values['margin'];
  mx?: Values['margin'];
  my?: Values['margin'];
  mt?: Values['margin'];
  mr?: Values['margin'];
  mb?: Values['margin'];
  ml?: Values['margin'];
  ms?: Values['margin'];
  me?: Values['margin'];

  gap?: Values['spacing'];
  gapX?: Values['spacing'];
  gapY?: Values['spacing'];

  w?: Values['size'];
  minW?: Values['size'];
  maxW?: Values['size'];
  h?: Values['size'];
  minH?: Values['size'];
  maxH?: Values['size'];
  size?: Values['size'];

  bg?: Values['color'];
  text?: Values['text'];
  borderColor?: Values['color'];
  outlineColor?: Values['color'];
  ringColor?: Values['color'];

  textSize?: Values['fontSize'];
  font?: Values['fontWeight'];
  leading?: Values['lineHeight'];
  tracking?: Values['letterSpacing'];
  align?: TailwindTextAlignValue;

  rounded?: Values['radius'];
  roundedT?: Values['radius'];
  roundedR?: Values['radius'];
  roundedB?: Values['radius'];
  roundedL?: Values['radius'];
  roundedTl?: Values['radius'];
  roundedTr?: Values['radius'];
  roundedBr?: Values['radius'];
  roundedBl?: Values['radius'];

  shadow?: Values['shadow'];
  opacity?: Values['opacity'];
  z?: Values['zIndex'];

  relative?: boolean;
  absolute?: boolean;
  fixed?: boolean;
  sticky?: boolean;

  inset?: Values['spacing'];
  insetX?: Values['spacing'];
  insetY?: Values['spacing'];
  top?: Values['spacing'];
  right?: Values['spacing'];
  bottom?: Values['spacing'];
  left?: Values['spacing'];

  select?: TailwindSelectValue;
  pointerEvents?: TailwindPointerEventsValue;

  cursor?: string;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
};

export type TailwindExtendedStyle<Theme extends TailwindTheme = TailwindTheme> =
  & TailwindCssProperties
  & TailwindStyle<Theme>;
