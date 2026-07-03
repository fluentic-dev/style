import { bindScope, combineStyle, createTokens, style } from '@fluentic/style';
import type { StyleTheme } from '@fluentic/style';

export const deepLinkedCardVars = createTokens({
  color: '#0f766e',
});

const styles = {
  root: style.slot({
    alignContent: 'space-between',
    backgroundColor: '#ffffff',
    border: '1px solid color-mix(in srgb, currentColor 26%, transparent)',
    borderRadius: 8,
    color: deepLinkedCardVars.color,
    display: 'grid',
    gap: 16,
    minHeight: 180,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
  }),
  marker: style({
    backgroundColor: deepLinkedCardVars.color,
    height: 5,
    inset: '0 0 auto',
    position: 'absolute',
  }),
  label: style.slot({
    color: '#334155',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
  }),
  title: style.slot({
    color: '#111827',
    fontSize: 22,
    fontWeight: 850,
    lineHeight: 1.08,
    margin: 0,
  }),
  sample: style.slot({
    alignItems: 'center',
    backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
    border: '1px solid color-mix(in srgb, currentColor 24%, transparent)',
    borderRadius: 7,
    color: deepLinkedCardVars.color,
    display: 'flex',
    fontSize: 13,
    fontWeight: 800,
    justifyContent: 'space-between',
    minHeight: 42,
    padding: '10px 12px',
  }),
};

type DeepLinkedTokenCardProps = {
  label: string;
  title: string;
  scope?: StyleTheme;
};

export function DeepLinkedTokenCard(props: DeepLinkedTokenCardProps) {
  const css = combineStyle(
    styles,
    bindScope(styles.root, props.scope),
  );

  return (
    <article css={css.root}>
      <span css={css.marker} aria-hidden />
      <span css={css.label}>{props.label}</span>
      <h2 css={css.title}>{props.title}</h2>
      <span css={css.sample}>
        <span>component var</span>
        <span>linked</span>
      </span>
    </article>
  );
}
