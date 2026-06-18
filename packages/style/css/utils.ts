import { CSS_CONFIG } from '../config/config/css';
import type { NamedAtRuleFormat, TokenNameFormat } from '../config/types';
import type { StyleTokenData } from '../style/token';
import { type AtRuleRef, createAtRuleRef } from '../style/valueRef';
import { getId, type IdCounter, type StableId } from '../utils/id';

export type StableIdInput = StableId;

export type BuiltAtRuleCss = {
  name: string;
  css: string;
};

export type BuildNamedAtRuleCss<Value> = (
  format: NamedAtRuleFormat | null,
  name: string | null,
  id: string,
  value: Value,
  tokens: StyleTokenData[],
  tokenLookup: Set<string>,
  tokenNameFormat: TokenNameFormat | null,
) => BuiltAtRuleCss;

type CreateNamedAtRuleRefConfig<Value> = {
  format: NamedAtRuleFormat | null | undefined;
  value: Value;
  buildCss: BuildNamedAtRuleCss<Value>;
  idCounter: IdCounter;
  stableId: StableId | null | undefined;
};

export function createNamedAtRuleRef<Value>(
  config: CreateNamedAtRuleRefConfig<Value>,
): AtRuleRef {
  const { id, name } = getId(config.idCounter, config.stableId || null);

  const tokens: StyleTokenData[] = [];
  const tokenLookup = new Set<string>();

  const css = config.buildCss(
    config.format || null,
    name,
    id,
    config.value,
    tokens,
    tokenLookup,
    CSS_CONFIG.tokenNameFormat || null,
  );

  return createAtRuleRef({
    key: css.name,
    value: css.name,
    css: css.css,
    tokens: tokens.length ? tokens : undefined,
  });
}
