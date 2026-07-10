import type { TOKEN_ID } from '../../../style/token';
import type { TailwindTheme } from '../types';

type ScaleKey = string | number;
type ScaleLeaf = ((...args: any[]) => unknown) | { readonly [TOKEN_ID]: string; };
type KebabCaseRest<Value extends string> = Value extends `${infer Head}${infer Tail}`
  ? Head extends Lowercase<Head> ? `${Head}${KebabCaseRest<Tail>}` : `-${Lowercase<Head>}${KebabCaseRest<Tail>}`
  : Value;
type KebabCase<Value extends string> = Value extends `${infer Head}${infer Tail}`
  ? `${Lowercase<Head>}${KebabCaseRest<Tail>}`
  : Value;
type ScaleClassKey<Key extends ScaleKey> = Key extends string ? KebabCase<Key> : `${Key}`;
type KnownScaleKeys<Scale> = keyof NonNullable<Scale> extends infer Key
  ? Key extends ScaleKey ? string extends Key ? never
    : number extends Key ? never
    : Key
  : never
  : never;
type ScaleClassPath<Scale> = Scale extends unknown ? NonNullable<Scale> extends infer ResolvedScale ? {
      [Key in Extract<KnownScaleKeys<ResolvedScale>, ScaleKey>]: ResolvedScale[Key] extends ScaleLeaf
        ? ScaleClassKey<Key>
        : ResolvedScale[Key] extends Record<ScaleKey, unknown>
          ? `${ScaleClassKey<Key>}-${Extract<ScaleClassPath<ResolvedScale[Key]>, string>}`
        : ScaleClassKey<Key>;
    }[Extract<KnownScaleKeys<ResolvedScale>, ScaleKey>]
  : never
  : never;
type ScaleValue<Scale> = ScaleClassPath<Scale>;
type ArbitraryValue = `[${string}]`;
type ColorLiteral = 'transparent' | 'current' | 'black' | 'white';
type LengthLiteral = 'auto' | 'full' | 'screen' | 'min' | 'max' | 'fit' | '0';
type ArbitraryClassName = `[${string}:${string}]`;

type TailwindStaticClassName =
  | 'block'
  | 'inline-block'
  | 'inline-flex'
  | 'flex'
  | 'grid'
  | 'hidden'
  | 'relative'
  | 'absolute'
  | 'fixed'
  | 'sticky'
  | 'items-start'
  | 'items-end'
  | 'items-center'
  | 'items-baseline'
  | 'items-stretch'
  | 'justify-start'
  | 'justify-end'
  | 'justify-center'
  | 'justify-between'
  | 'justify-around'
  | 'justify-evenly'
  | 'flex-row'
  | 'flex-row-reverse'
  | 'flex-col'
  | 'flex-col-reverse'
  | 'flex-wrap'
  | 'flex-wrap-reverse'
  | 'shrink-0'
  | 'overflow-hidden'
  | 'overflow-auto'
  | 'overflow-x-hidden'
  | 'overflow-x-auto'
  | 'overflow-y-hidden'
  | 'overflow-y-auto'
  | 'cursor-pointer'
  | 'outline-none'
  | 'whitespace-nowrap'
  | 'min-w-0'
  | 'justify-self-end';

type TailwindSpacingClassName<Theme extends TailwindTheme> =
  | `gap-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `gap-x-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `gap-y-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `mt-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `m-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `mx-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `my-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `p-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `px-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `py-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `pt-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `pr-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `pb-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `pl-${ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`;

type TailwindSizeClassName<Theme extends TailwindTheme> =
  | `w-${ScaleValue<Theme['sizes']> | ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `max-w-${ScaleValue<Theme['sizes']> | ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `min-w-${ScaleValue<Theme['sizes']> | ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `min-h-${ScaleValue<Theme['sizes']> | ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `h-${ScaleValue<Theme['sizes']> | ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`
  | `size-${ScaleValue<Theme['sizes']> | ScaleValue<Theme['spacing']> | ArbitraryValue | LengthLiteral}`;

type TailwindColorClassName<Theme extends TailwindTheme> =
  | `bg-${ScaleValue<Theme['colors']> | ArbitraryValue | ColorLiteral}`
  | `text-${ScaleValue<Theme['colors']> | ArbitraryValue | ColorLiteral}`
  | `border-${ScaleValue<Theme['colors']> | ArbitraryValue | ColorLiteral}`
  | `outline-${ScaleValue<Theme['colors']> | ArbitraryValue | ColorLiteral}`;

type TailwindTypographyClassName<Theme extends TailwindTheme> =
  | `text-${ScaleValue<Theme['fontSizes']> | ArbitraryValue}`
  | `font-${ScaleValue<Theme['fontWeights']> | ArbitraryValue}`
  | `leading-${ScaleValue<Theme['lineHeights']> | ArbitraryValue}`;

type TailwindVisualClassName<Theme extends TailwindTheme> =
  | `rounded-${ScaleValue<Theme['radii']> | ArbitraryValue}`
  | `shadow-${ScaleValue<Theme['shadows']> | ArbitraryValue}`
  | `border-${string}`;

export type TailwindClassNameFor<Theme extends TailwindTheme> =
  | TailwindStaticClassName
  | TailwindSpacingClassName<Theme>
  | TailwindSizeClassName<Theme>
  | TailwindColorClassName<Theme>
  | TailwindTypographyClassName<Theme>
  | TailwindVisualClassName<Theme>
  | ArbitraryClassName;

export type TailwindClassName = TailwindClassNameFor<TailwindTheme>;
