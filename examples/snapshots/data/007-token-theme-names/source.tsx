import { combineStyle, createTheme, createToken, createTokens, createValues, style } from '@fluentic/style';

const accent = createToken('#2563eb', 'accent');
const anonymous = createToken('0 18px 48px rgba(15, 23, 42, 0.14)');

const theme = createTokens({
  background: {
    page: '#ffffff',
    panel: '#f8fafc',
  },
  text: {
    body: '#111827',
    muted: '#64748b',
  },
});

const space = createValues(Number, [
  '12 | sm',
  '24 | lg',
]);

const tone = createValues([
  '#ffffff | Surface',
  '#111827; Text',
]);

export const lightTheme = createTheme([
  theme.background.page('#f8fafc'),
  theme.text.body('#0f172a'),
], 'theme-light');

export const brandTheme = createTheme([
  theme.background.panel('#eef2ff'),
  theme.text.muted('#475569'),
], 'themes--brand');

const styles = {
  card: style({
    backgroundColor: theme.background.page,
    borderColor: accent,
    boxShadow: anonymous,
    color: theme.text.body,
    margin: space('12 | sm'),
    padding: space('24 | lg'),
  }).hover({
    backgroundColor: tone('#ffffff | Surface'),
    color: tone('#111827; Text'),
  }),
};

export default function TokenThemeNames() {
  return (
    <section css={[lightTheme, brandTheme, combineStyle(styles).card]}>
      token and theme names
    </section>
  );
}
