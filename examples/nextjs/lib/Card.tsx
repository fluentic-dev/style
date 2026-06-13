import { combineStyle } from '@fluentic/style';
import type { ReactNode } from 'react';
import { emphasis, page } from './styles';

type CardProps = {
  title: string;
  children: ReactNode;
  important?: boolean;
};

export function Card(props: CardProps) {
  const css = combineStyle(page, props.important ? emphasis(page.card) : undefined);

  return (
    <article css={css.card}>
      <div css={css.cardAccent} />
      <h2 css={css.cardTitle}>{props.title}</h2>
      <p css={css.cardText}>{props.children}</p>
    </article>
  );
}
