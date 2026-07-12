/// <reference types="vite/client" />
import 'virtual:fluentic-style';

import {
  bindScope,
  type CombinedStyleFor,
  combineScope,
  combineStyle,
  createTheme,
  createToken,
  createTokens,
  createValues,
  getClassName,
  getToken,
  style,
  type StyleTheme,
} from '@fluentic/style';
import { enableStyleDevUtils } from '@fluentic/style/dev';
import { mergeClassName, mergeStyle } from '@fluentic/style/entry/prod/runtime';
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './reset.css';

if (import.meta.env.DEV) {
  enableStyleDevUtils();
}

const accent = createToken('#2563eb');
const accentAlias = createToken(accent);

const tokens = createTokens({
  color: {
    surface: '#ffffff',
    text: '#172033',
    muted: '#64748b',
    accent: '#2563eb',
    wash: '#eff6ff',
  },
  radius: {
    panel: 18,
    pill: 999,
  },
});

const space = createValues(Number, [
  '10 | sm',
  '18 | md',
]);

const tone = createValues([
  '#eff6ff | Soft',
  '#dbeafe | Active',
]);

const lightTheme = createTheme([
  tokens.color.surface('#ffffff'),
  tokens.color.text('#172033'),
  tokens.color.muted('#64748b'),
  tokens.color.accent('#2563eb'),
  tokens.color.wash('#eff6ff'),
]);

const vividTheme = createTheme([
  tokens.color.surface('#f8fbff'),
  tokens.color.accent(accentAlias),
  tokens.color.wash('#dbeafe'),
]);

const cardStyles = {
  root: style.slot({
    backgroundColor: tokens.color.surface,
    border: '1px solid',
    borderColor: tokens.color.accent,
    borderRadius: tokens.radius.panel,
    color: tokens.color.text,
    display: 'grid',
    gap: space('10 | sm'),
    padding: space('18 | md'),
  }).hover({
    backgroundColor: tone('#eff6ff | Soft'),
  }),
  title: style.slot({
    color: tokens.color.text,
    fontSize: 28,
    fontWeight: 850,
    letterSpacing: 0,
    lineHeight: 1.02,
    margin: 0,
  }),
  body: style.slot({
    color: tokens.color.muted,
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
  }),
  badge: style.slot({
    backgroundColor: tokens.color.accent,
    borderRadius: tokens.radius.pill,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    padding: '5px 9px',
    width: 'fit-content',
  }),
};

const pageStyles = {
  page: style({
    minHeight: '100vh',
    backgroundColor: '#f6f8fb',
    color: '#172033',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    padding: 24,
  }),
  shell: style({
    width: 'min(1040px, 100%)',
    margin: '0 auto',
    display: 'grid',
    gap: 18,
  }),
  header: style({
    display: 'grid',
    gap: 10,
    padding: '28px 0 8px',
  }),
  eyebrow: style({
    color: '#315b9f',
    fontSize: 12,
    fontWeight: 850,
    letterSpacing: 0,
    margin: 0,
    textTransform: 'uppercase',
  }),
  heading: style({
    fontSize: 42,
    lineHeight: 1,
    margin: 0,
  }),
  subhead: style({
    color: '#526173',
    fontSize: 16,
    lineHeight: 1.55,
    margin: 0,
    maxWidth: 720,
  }),
  grid: style({
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(260px, 0.65fr)',
  }).media('(max-width: 760px)', {
    gridTemplateColumns: '1fr',
  }),
  panel: style({
    backgroundColor: '#ffffff',
    border: '1px solid #dbe2ec',
    borderRadius: 8,
    boxShadow: '0 20px 70px rgba(35, 46, 72, 0.10)',
    padding: 18,
  }),
  controls: style({
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  }),
  button: style({
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    color: '#172033',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 800,
    padding: '9px 12px',
  }).hover({
    borderColor: '#2563eb',
  }),
  buttonActive: style({
    backgroundColor: '#172033',
    borderColor: '#172033',
    color: '#ffffff',
  }),
  checklist: style({
    display: 'grid',
    gap: 8,
    margin: 0,
    padding: 0,
  }),
  checkItem: style({
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    display: 'grid',
    fontSize: 13,
    fontWeight: 760,
    gap: 8,
    gridTemplateColumns: '10px 1fr',
    listStyle: 'none',
    padding: '9px 10px',
  }),
  dot: style({
    backgroundColor: '#16a34a',
    borderRadius: 999,
    height: 10,
    width: 10,
  }),
  code: style({
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#d1fae5',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.55,
    overflow: 'auto',
    padding: 14,
  }),
};

const activeScope = style
  .scope([
    cardStyles.root({
      boxShadow: '0 18px 44px rgba(37, 99, 235, 0.16)',
    }),
    cardStyles.badge({
      backgroundColor: accent,
    }),
  ])
  .hover([
    cardStyles.root({
      borderColor: accentAlias,
    }),
    cardStyles.title({
      color: tokens.color.accent,
    }),
  ]);

const quietScope = style.scope([
  cardStyles.root({
    boxShadow: '0 18px 44px rgba(37, 46, 72, 0.10)',
  }),
  cardStyles.badge({
    backgroundColor: '#475569',
  }),
]);

const combineCard = combineStyle.for(cardStyles);
const combinePage = combineStyle.for(pageStyles);
type CardStyle = CombinedStyleFor<typeof combineCard>;

function ContractCard(props: { active: boolean; styles?: CardStyle; theme?: StyleTheme; }) {
  const theme = combineScope(
    lightTheme,
    props.active && vividTheme,
    props.active ? activeScope : quietScope,
    props.theme,
  );
  const css = combineCard(
    props.styles,
    bindScope(cardStyles.root, theme),
    props.active && cardStyles.root({
      backgroundColor: tone('#dbeafe | Active'),
    }),
  );
  const dynamicFrame = style({
    outlineColor: props.active ? accent : tokens.color.muted,
    outlineOffset: 3,
    outlineStyle: 'solid',
    outlineWidth: props.active ? 2 : 1,
  });

  const rootProps = getClassName([css.root, dynamicFrame], {
    className: mergeClassName(['contract-card', props.active && 'is-active']),
    style: mergeStyle([
      { '--contract-accent': String(getToken(tokens.color.accent)) },
      props.active && { '--contract-state': 'active' },
    ]),
  });

  return (
    <article {...rootProps}>
      <strong css={css.badge}>extracted</strong>
      <h2 css={css.title}>Runtime contract</h2>
      <p css={css.body}>
        This card uses extracted slots, token themes, scoped parent hover selectors, dynamic token bindings, and
        explicit getClassName props.
      </p>
    </article>
  );
}

function App() {
  const [active, setActive] = useState(true);
  const page = combinePage();
  const scoped = useMemo(() => combineCard(bindScope(cardStyles.root, activeScope)), []);
  const tokenPreview = String(getToken(accentAlias));
  const pageClass = getClassName(page.page).className ?? '';

  const checks = [
    ['theme classes', tokenPreview.includes('--token-accentAlias-')],
    ['getClassName output', pageClass.length > 0],
    ['combineStyle carry', Boolean(scoped.root)],
    ['merge helpers', mergeClassName(['a', false, 'b']) === 'a b'],
  ];

  return (
    <main css={page.page}>
      <section css={page.shell}>
        <header css={page.header}>
          <p css={page.eyebrow}>Extracted mode app check</p>
          <h1 css={page.heading}>Public runtime API, real browser bundle.</h1>
          <p css={page.subhead}>
            Run this in Vite dev or build it for production to verify the extracted runtime contract outside snapshots.
          </p>
        </header>

        <div css={page.grid}>
          <section css={page.panel}>
            <div css={page.controls}>
              <button css={[page.button, active && page.buttonActive]} type='button' onClick={() => setActive(true)}>
                Active theme
              </button>
              <button css={[page.button, !active && page.buttonActive]} type='button' onClick={() => setActive(false)}>
                Quiet theme
              </button>
            </div>
            <div css={style({ height: 14 })} />
            <ContractCard active={active} styles={scoped} />
          </section>

          <aside css={page.panel}>
            <ul css={page.checklist}>
              {checks.map(([label, ok]) => (
                <li css={page.checkItem} key={String(label)}>
                  <span css={page.dot} />
                  {label}: {ok ? 'ok' : 'missing'}
                </li>
              ))}
            </ul>
            <pre css={page.code}>{tokenPreview}</pre>
          </aside>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
