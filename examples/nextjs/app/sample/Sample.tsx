import { bindScope, combineStyle, style } from '@fluentic/style';
import type { StyleTheme } from '@fluentic/style';

const cardStyles = {
  card: style.slot({
    padding: style.priority(18, 2),
    borderRadius: 18,
    background: '#ffffff',
    border: '1px solid #dbeafe',
  }),
  label: style.slot({
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: '#e0f2fe',
    color: '#075985',
  }),
  note: style.slot({
    marginTop: 12,
    marginBottom: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: '#334155',
  }),
  button: style.slot({
    marginTop: 14,
    border: 'none',
    borderRadius: 999,
    padding: '10px 14px',
    background: '#0f172a',
    color: '#f8fafc',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
  }).hover({
    backgroundColor: '#be123c',
  }),
};

const sampleStyles = {
  page: style({
    marginTop: 18,
    color: '#0f172a',
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
  }),
  frame: style({
    margin: '0 auto',
  }),
  hero: style({
    padding: 20,
    borderRadius: 20,
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
  }).hover({
    borderColor: '#38bdf8',
  }).media('(max-width: 720px)', {
    padding: 16,
    borderRadius: 14,
    borderColor: '#f59e0b',
    background: '#fffbeb',
    boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.18), 0 14px 34px rgba(15, 23, 42, 0.08)',
  }),
  badge: style({
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: '#e0f2fe',
    color: '#075985',
    marginBottom: 10,
  }),
  title: style({
    margin: 0,
    fontSize: 34,
    lineHeight: 1.05,
  }),
  lead: style({
    marginTop: 10,
    marginBottom: 0,
    maxWidth: 700,
    fontSize: 15,
    lineHeight: 1.6,
    color: '#475569',
  }),
  grid: style({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 16,
    marginTop: 18,
  }).media('(max-width: 720px)', {
    gridTemplateColumns: '1fr',
    gap: 12,
  }),
};

const parentHoverScope = style.scope().hover([
  cardStyles.label({
    background: '#dbeafe',
    color: '#1d4ed8',
  }),
  cardStyles.note({
    color: '#1e3a8a',
  }),
  cardStyles.button({
    background: '#2563eb',
  }),
]);

const accentCardTheme = style.scope([
  cardStyles.card({
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    color: '#78350f',
    borderColor: '#f59e0b',
  }),
  cardStyles.label({
    background: '#5b21b6',
    color: '#f5f3ff',
  }),
  cardStyles.button().hover({
    background: '#ad5a2b',
  }),
]).hover([
  cardStyles.label({
    background: '#2563eb',
    color: '#ffffff',
  }),
]).media('(max-width: 720px)', [
  cardStyles.card({
    background: '#ecfccb',
    borderColor: '#65a30d',
    borderStyle: 'dashed',
    borderWidth: 2,
    boxShadow: 'inset 0 0 0 3px rgba(34, 197, 94, 0.22), 0 14px 30px rgba(77, 124, 15, 0.16)',
  }),
  cardStyles.label({
    background: '#4c1d95',
    color: '#f5f3ff',
  }),
]);

type CardProps = {
  label: string;
  note: string;
  buttonLabel: string;
  theme?: StyleTheme;
};

function SampleCard(props: CardProps) {
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

export function Sample() {
  const css = combineStyle(sampleStyles);

  return (
    <main css={css.page}>
      <div css={css.frame}>
        <section css={css.hero}>
          <p css={css.badge}>Next.js local sample</p>
          <h1 css={css.title}>Fluentic on Next.js</h1>
          <p css={css.lead}>
            This page keeps the shared bundler display local to the Next.js app while exercising
            <code>style()</code>, <code>style.slot()</code>, <code>style.scope()</code>, and the
            <code>combineStyle</code> hook through the Next plugin and custom JSX runtime.
          </p>
        </section>

        <section css={css.grid}>
          <SampleCard
            label='Parent hover'
            note='Hover the card to let the parent scope recolor the child label, note, and action. Then hover the action itself so its own slot hover can win.'
            buttonLabel='Hover card'
            theme={parentHoverScope}
          />

          <SampleCard
            label='Theme scope'
            note='This card uses a scope as a small theme. Resize below 720px and its provided scope also changes the card surface, border, and label colors.'
            buttonLabel='Hover card, then me'
            theme={accentCardTheme}
          />
        </section>
      </div>
    </main>
  );
}
