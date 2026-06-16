import type * as CSS from 'csstype';

export type * as CSS from 'csstype';

export type CSSValueExclude = '-moz-initial';

export type CSSProperties = {
  [P in keyof CSS.Properties<string | number>]: Exclude<CSS.Properties<string | number>[P], CSSValueExclude>;
};

export type CSSPropertyName = keyof CSS.Properties<string | number>;
