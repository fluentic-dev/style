import { bindScope, combineStyle } from '@fluentic/style';
import type { CssTheme } from '@fluentic/style';

import { cardStyles } from '../App.styles';

type CardProps = {
  label: string;
  note: string;
  buttonLabel: string;
  theme?: CssTheme;
};

export function Card(props: CardProps) {
  const css = combineStyle(
    cardStyles,
    bindScope(cardStyles.card, props.theme),
  );

  return (
    <article css={css.card}>
      <p css={css.label}>{props.label}</p>
      <p css={css.note}>{props.note}</p>
      <button css={css.button}>{props.buttonLabel}</button>
    </article>
  );
}
