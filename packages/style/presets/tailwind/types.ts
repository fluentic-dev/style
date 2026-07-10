export type TailwindScale = Record<string | number, unknown>;

export type TailwindTheme = {
  spacing?: TailwindScale;
  colors?: TailwindScale;
  radii?: TailwindScale;
  fontSizes?: TailwindScale;
  fontWeights?: TailwindScale;
  lineHeights?: TailwindScale;
  letterSpacings?: TailwindScale;
  shadows?: TailwindScale;
  sizes?: TailwindScale;
  zIndices?: TailwindScale;
  opacity?: TailwindScale;
};

type TailwindDefaultSpacingKey =
  | 0
  | 'px'
  | 0.5
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 3.5
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 14
  | 16
  | 20
  | 24
  | 28
  | 32
  | 36
  | 40
  | 44
  | 48
  | 52
  | 56
  | 60
  | 64
  | 72
  | 80
  | 96;
type TailwindDefaultColorName =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'mauve'
  | 'olive'
  | 'mist'
  | 'taupe';
type TailwindDefaultColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
type TailwindDefaultNamedColorKey = 'transparent' | 'current' | 'black' | 'white';
type TailwindDefaultRadiusKey = 'none' | 'sm' | 'DEFAULT' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
type TailwindDefaultFontSizeKey = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
type TailwindDefaultFontWeightKey =
  | 'thin'
  | 'extralight'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 'black';
type TailwindDefaultLineHeightKey = 'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';
type TailwindDefaultLetterSpacingKey = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
type TailwindDefaultShadowKey = 'sm' | 'DEFAULT' | 'md' | 'lg' | 'xl' | 'none';
type TailwindDefaultSizeKey = 'auto' | 'full' | 'screen' | 'min' | 'max' | 'fit';
type TailwindDefaultOpacityKey = 0 | 5 | 10 | 20 | 25 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 95 | 100;
type TailwindDefaultZIndexKey = 'auto' | 0 | 10 | 20 | 30 | 40 | 50;

export type TailwindDefaultTheme = {
  spacing: Record<TailwindDefaultSpacingKey, unknown>;
  radii: Record<TailwindDefaultRadiusKey, unknown>;
  fontSizes: Record<TailwindDefaultFontSizeKey, unknown>;
  fontWeights: Record<TailwindDefaultFontWeightKey, unknown>;
  lineHeights: Record<TailwindDefaultLineHeightKey, unknown>;
  letterSpacings: Record<TailwindDefaultLetterSpacingKey, unknown>;
  shadows: Record<TailwindDefaultShadowKey, unknown>;
  sizes: Record<TailwindDefaultSizeKey, unknown>;
  opacity: Record<TailwindDefaultOpacityKey, unknown>;
  zIndices: Record<TailwindDefaultZIndexKey, unknown>;
};

export type TailwindDefaultColors =
  & Record<TailwindDefaultColorName, Record<TailwindDefaultColorShade, unknown>>
  & Record<TailwindDefaultNamedColorKey, unknown>;

type TailwindThemeScaleName = keyof TailwindTheme;
type MergeTailwindScale<Base, Override> =
  | NonNullable<Base>
  | NonNullable<Override>;

type RequiredMergeTailwindThemeScales<
  Base extends TailwindTheme,
  Override extends TailwindTheme,
> = {
  [
    Scale in TailwindThemeScaleName as Scale extends keyof Base ? Scale
      : Scale extends keyof Override ? Scale
      : never
  ]: MergeTailwindScale<Base[Scale], Override[Scale]>;
};

export type MergeTailwindTheme<
  Base extends TailwindTheme,
  Override extends TailwindTheme,
> =
  & Omit<Base & Override, TailwindThemeScaleName>
  & RequiredMergeTailwindThemeScales<Base, Override>;

export type TailwindStyleTransformOptions<Theme extends TailwindTheme> = {
  theme?: Theme;
};

export type TailwindStyleConfig<Theme extends TailwindTheme = TailwindTheme> = {
  theme: Theme;
};
