import { combineStyle, createTheme, createTokens, style, type StyleProp } from '@fluentic/style';

const tokens = createTokens({
  color: {
    bg: '#ffffff',
    text: '#17201b',
    muted: '#5f6f67',
    accent: '#0f766e',
    accentText: '#ffffff',
  },
  radius: {
    card: 14,
    pill: 999,
  },
  shadow: {
    card: '0 18px 40px rgba(34, 42, 37, 0.08)',
  },
});

const lightTheme = createTheme([
  tokens.color.bg('#ffffff'),
  tokens.color.text('#17201b'),
  tokens.color.muted('#5f6f67'),
  tokens.color.accent('#0f766e'),
  tokens.color.accentText('#ffffff'),
  tokens.shadow.card('0 18px 40px rgba(34, 42, 37, 0.08)'),
]);

const darkTheme = createTheme([
  tokens.color.bg('#101715'),
  tokens.color.text('#eef8f4'),
  tokens.color.muted('#a7bbb2'),
  tokens.color.accent('#5eead4'),
  tokens.color.accentText('#06201c'),
  tokens.shadow.card('0 22px 48px rgba(0, 0, 0, 0.34)'),
]);

const styles = {
  card: style.slot({
    backgroundColor: tokens.color.bg,
    border: '1px solid',
    borderColor: tokens.color.accent,
    borderRadius: tokens.radius.card,
    boxShadow: tokens.shadow.card,
    color: tokens.color.text,
    display: 'grid',
    gap: 12,
    maxWidth: 360,
    padding: 18,
  }),
  eyebrow: style.slot({
    color: tokens.color.accent,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  }),
  title: style.slot({
    color: tokens.color.text,
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1.05,
    margin: 0,
  }),
  body: style.slot({
    color: tokens.color.muted,
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
  }),
  action: style.slot({
    backgroundColor: tokens.color.accent,
    borderRadius: tokens.radius.pill,
    color: tokens.color.accentText,
    fontSize: 13,
    fontWeight: 800,
    padding: '9px 14px',
    width: 'fit-content',
  }),
};

function Preview(props: { theme: StyleProp; title: string; }) {
  const css = combineStyle(styles);

  return (
    <article css={[props.theme, css.card]}>
      <span css={css.eyebrow}>nested tokens</span>
      <h2 css={css.title}>{props.title}</h2>
      <p css={css.body}>
        Nested semantic tokens stay themeable while components read from one stable token tree.
      </p>
      <span css={css.action}>Theme ready</span>
    </article>
  );
}

export default function App() {
  return (
    <main>
      <Preview theme={lightTheme} title='Light theme' />
      <Preview theme={darkTheme} title='Dark theme' />
    </main>
  );
}
