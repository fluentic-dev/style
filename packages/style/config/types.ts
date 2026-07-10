export type SourcemapLocationMode = 'style' | 'value';
export type StylePriorityMode = 'layer' | 'sort';
export type CheckSelectorMode = boolean | 'force';

export type ClassNameInfo = {
  atRule: string | null;
  scopeSelector: string | null;
  selector: string | null;
  property: string;
  value: string | null;
};

export type TransformClassNameInfo = {
  className: string;
};

export type ScopeClassNameInfo = {
  className: string;
};

export type ElementClassNameInfo = {
  name: string | null;
};

export type TokenNameInfo = {
  name: string | null;
};

export type ThemeNameInfo = {
  name: string | null;
};

export type NamedAtRuleInfo = {
  name: string | null;
};

export type VarNameInfo = {
  name: string | null;
};

export type ClassNameFormatFn = (info: ClassNameInfo) => string;
export type ClassNameFormat = string | ClassNameFormatFn;

export type TransformClassNameFormatFn = (info: TransformClassNameInfo) => string;
export type TransformClassNameFormat = string | TransformClassNameFormatFn;

export type ScopeClassNameFormatFn = (info: ScopeClassNameInfo) => string;
export type ScopeClassNameFormat = string | ScopeClassNameFormatFn;

export type ElementClassNameFormatFn = (info: ElementClassNameInfo) => string;
export type ElementClassNameFormat = string | ElementClassNameFormatFn;

export type TokenNameFormatFn = (info: TokenNameInfo) => string;
export type TokenNameFormat = string | TokenNameFormatFn;

export type ThemeNameFormatFn = (info: ThemeNameInfo) => string;
export type ThemeNameFormat = string | ThemeNameFormatFn;

export type NamedAtRuleFormatFn = (info: NamedAtRuleInfo) => string;
export type NamedAtRuleFormat = string | NamedAtRuleFormatFn;

export type VarNameFormatFn = (info: VarNameInfo) => string;
export type VarNameFormat = string | VarNameFormatFn;
