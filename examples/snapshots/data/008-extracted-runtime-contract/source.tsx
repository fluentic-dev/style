import {
  bindScope,
  type CombinedStyleFor,
  combineStyle,
  createTheme,
  createToken,
  createTokens,
  createValues,
  getClassName,
  getToken,
  style,
} from '@fluentic/style';
import { mergeClassName, mergeStyle } from '@fluentic/style/entry/prod/runtime';
import type { CSSProperties } from 'react';

const accent = createToken('#2563eb');
const accentAlias = createToken(accent);

const tokens = createTokens({
  color: {
    surface: '#ffffff',
    text: '#172033',
    muted: '#64748b',
    accent: '#2563eb',
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
]);

const vividTheme = createTheme([
  tokens.color.surface('#f8fbff'),
  tokens.color.accent(accentAlias),
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
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
  }),
  badge: style.slot({
    backgroundColor: tokens.color.accent,
    borderRadius: tokens.radius.pill,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    padding: '5px 9px',
    width: 'fit-content',
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

const combineCard = combineStyle.for(cardStyles);
type CardStyle = CombinedStyleFor<typeof combineCard>;

function ContractCard(props: { active?: boolean; styles?: CardStyle; }) {
  const css = combineCard(
    props.styles,
    bindScope(cardStyles.root, activeScope),
  );
  const dynamicFrame = style({
    backgroundColor: props.active ? tone('#dbeafe | Active') : tokens.color.surface,
    outlineColor: props.active ? accent : tokens.color.muted,
    outlineStyle: 'solid',
    outlineWidth: props.active ? 2 : 1,
  });

  const rootProps = getClassName([css.root, dynamicFrame], {
    className: mergeClassName(['contract-card', props.active && 'is-active']),
    style: mergeStyle([
      { '--contract-accent': String(getToken(tokens.color.accent)) } as CSSProperties,
      props.active && ({ '--contract-state': 'active' } as CSSProperties),
    ]),
  });

  return (
    <article {...rootProps}>
      <strong css={css.badge}>extracted</strong>
      <h2 css={css.title}>Runtime contract</h2>
    </article>
  );
}

export default function ExtractedRuntimeContract() {
  const scoped = combineCard(bindScope(cardStyles.root, activeScope));

  return (
    <main>
      <div css={[lightTheme, vividTheme]}>
        <ContractCard styles={scoped} active />
      </div>
      <output>{String(getToken(tokens.color.muted))}</output>
    </main>
  );
}
