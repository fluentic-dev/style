import type * as CSS from 'csstype';

export type * as CSS from 'csstype';

export type CSSValueExclude = '-moz-initial';

export type CSSPropertiesRaw = CSS.Properties<string | number>;

export type CSSProperties = {
  [P in keyof CSSPropertiesRaw]: Exclude<CSSPropertiesRaw[P], CSSValueExclude>;
};

export type CSSPropertyName = keyof CSSPropertiesRaw;
