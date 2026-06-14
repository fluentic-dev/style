import { combineStyle, createTokens, style } from '@fluentic/style';
import { Card } from '../../lib/Card';
import { Chrome } from '../../lib/Chrome';
import { page } from '../../lib/styles';
import { ClientTokenPanel } from './ClientTokenPanel';

const tokenDefaults = {
  tone: '#7c2d12',
  surface: 'rgba(255,255,255,0.88)',
  ring: 'rgba(124,45,18,0.24)',
};

const tokens = createTokens(tokenDefaults);

const styles = {
  heading: style({
    color: tokens.tone,
    textDecorationColor: tokens.ring,
    textDecorationLine: 'underline',
    textDecorationThickness: 3,
    textUnderlineOffset: 8,
  }),
  detail: style.slot({
    backgroundColor: tokens.surface,
    borderColor: tokens.ring,
    color: tokens.tone,
  }),
  value: style.slot({
    color: tokens.tone,
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1,
    margin: 0,
  }),
  swatch: style.slot({
    backgroundColor: tokens.tone,
    border: '1px solid rgba(20,24,31,0.12)',
    borderRadius: 999,
    height: 34,
    width: 34,
  }),
  row: style.slot({
    alignItems: 'center',
    display: 'flex',
    gap: 12,
  }),
};

async function ServerOnlyPanel() {
  const pageCss = combineStyle(page);
  const css = combineStyle(
    styles,
    tokens.tone('#0f766e'),
    tokens.surface('rgba(240,253,250,0.92)'),
    tokens.ring('rgba(15,118,110,0.24)'),
  );

  return (
    <article css={[pageCss.card, css.detail]}>
      <div css={pageCss.cardAccent} />
      <h2 css={pageCss.cardTitle}>server token override</h2>
      <div css={css.row}>
        <span css={css.swatch} />
        <p css={css.value}>RSC</p>
      </div>
      <p css={pageCss.cardText}>
        Token values are chosen during server render and arrive as CSS variables, not functions.
      </p>
    </article>
  );
}

export default function RscPage() {
  const issuedAt = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const css = combineStyle(page);
  const rscCss = combineStyle(
    styles,
    tokens.tone('#7c2d12'),
    tokens.surface('rgba(255,247,237,0.9)'),
    tokens.ring('rgba(124,45,18,0.22)'),
  );

  return (
    <Chrome>
      <section css={css.hero}>
        <span css={css.eyebrow}>React server component</span>
        <h1 css={[css.heading, rscCss.heading]}>RSC route</h1>
        <p css={css.intro}>
          Server-rendered style data, token overrides, and runtime dynamic values all resolve without passing functions
          through the client boundary.
        </p>
        <div css={css.metaRow}>
          <span css={css.metaPill}>rendered {issuedAt}</span>
          <span css={css.metaPill}>tokens + dynamic values</span>
        </div>
      </section>
      <section css={css.grid}>
        <ServerOnlyPanel />
        <Card title='plain server card' important>
          A normal server component can mix extracted classes with inherited scoped token values.
        </Card>
        <ClientTokenPanel initialTone='#7c2d12' />
      </section>
    </Chrome>
  );
}
