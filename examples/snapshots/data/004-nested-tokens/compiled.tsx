/* eslint-disable */
import { combineStyle, createTokens, type StyleProp } from '@fluentic/style';
import { createExtractedSlot, createExtractedTheme, createExtractedToken } from '@fluentic/style/entry/prod/extract';
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
}, 'tokens-jde1gk0');
const lightTheme = createExtractedTheme('15x3t4k', 'theme-bdybgxr');
const darkTheme = createExtractedTheme('17quq42', 'theme-hl8zs80');
const styles = {
  card: createExtractedSlot('1813flw', [
    ['mwx9540', 'bbwzet1', [
      1,
      '--var-bj92ohf',
      createExtractedToken('tokens-jde1gk0--color--bg', '#ffffff', null, 'color--bg', '--token-color--bg-c0wb4k0'),
      1,
    ]],
    ['rykr7b0', 'b3cpjgx'],
    ['109h4xq', 'bjteo6h', [
      1,
      '--var-b02f5sx',
      createExtractedToken(
        'tokens-jde1gk0--color--accent',
        '#0f766e',
        null,
        'color--accent',
        '--token-color--accent-bhydlup',
      ),
      1,
    ]],
    ['1aeebut', 'dzkss80', [
      1,
      '--var-uo62oq0',
      createExtractedToken('tokens-jde1gk0--radius--card', 14, null, 'radius--card', '--token-radius--card-svgtds0'),
      1,
    ]],
    ['1qi6vb6', 'dcjjn80', [
      1,
      '--var-cw5jiv0',
      createExtractedToken(
        'tokens-jde1gk0--shadow--card',
        '0 18px 40px rgba(34, 42, 37, 0.08)',
        null,
        'shadow--card',
        '--token-shadow--card-c0d5yq0',
      ),
      1,
    ]],
    ['18q1j80', 'bugfk5o', [
      1,
      '--var-bww5idk',
      createExtractedToken(
        'tokens-jde1gk0--color--text',
        '#17201b',
        null,
        'color--text',
        '--token-color--text-b9nf5kc',
      ),
      1,
    ]],
    ['1nca60l', 'jgp0up0'],
    ['1phh07j', 'uazf000'],
    ['14q2jir', 'bbrhkou'],
    ['1ffb9qm', 'zll9qj0'],
  ]),
  eyebrow: createExtractedSlot('1yuulhs', [
    ['18q1j80', 'jwnm900', [
      1,
      '--var-iax9200',
      createExtractedToken(
        'tokens-jde1gk0--color--accent',
        '#0f766e',
        null,
        'color--accent',
        '--token-color--accent-bhydlup',
      ),
      1,
    ]],
    ['1ut2mip', 'cwxf320'],
    ['1pkhne0', 'kfbuc00'],
    ['iah4wu0', 'tckx800'],
    ['nde9im0', 'bfgv0j6'],
  ]),
  title: createExtractedSlot('12jpkrm', [
    ['18q1j80', 'bocjfhb', [
      1,
      '--var-s9eo8d0',
      createExtractedToken(
        'tokens-jde1gk0--color--text',
        '#17201b',
        null,
        'color--text',
        '--token-color--text-b9nf5kc',
      ),
      1,
    ]],
    ['1ut2mip', 'w6vmo30'],
    ['1pkhne0', 'kfbuc00'],
    ['670umo0', 'xwgj4c0'],
    ['1r0p66z', 'fy69b50'],
  ]),
  body: createExtractedSlot('1o6sn49', [
    ['18q1j80', 'bjlxhh9', [
      1,
      '--var-qmj3wr0',
      createExtractedToken(
        'tokens-jde1gk0--color--muted',
        '#5f6f67',
        null,
        'color--muted',
        '--token-color--muted-hr8l6a0',
      ),
      1,
    ]],
    ['1ut2mip', 'bpi985b'],
    ['670umo0', 'b155prj'],
    ['1r0p66z', 'fy69b50'],
  ]),
  action: createExtractedSlot('hkvtdd0', [
    ['mwx9540', 'etskod0', [
      1,
      '--var-ve52860',
      createExtractedToken(
        'tokens-jde1gk0--color--accent',
        '#0f766e',
        null,
        'color--accent',
        '--token-color--accent-bhydlup',
      ),
      1,
    ]],
    ['1aeebut', 'pz8qtg0', [
      1,
      '--var-b587sfx',
      createExtractedToken('tokens-jde1gk0--radius--pill', 999, null, 'radius--pill', '--token-radius--pill-bf7bmed'),
      1,
    ]],
    ['18q1j80', 'x9hbbg0', [
      1,
      '--var-f7dii40',
      createExtractedToken(
        'tokens-jde1gk0--color--accentText',
        '#ffffff',
        null,
        'color--accentText',
        '--token-color--accentText-be1epma',
      ),
      1,
    ]],
    ['1ut2mip', 'baks490'],
    ['1pkhne0', 'kfbuc00'],
    ['1ffb9qm', 'b8kk8ny'],
    ['1hznesf', 'hjsx5a0'],
  ]),
};
function Preview(props: {
  theme: StyleProp;
  title: string;
}) {
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
