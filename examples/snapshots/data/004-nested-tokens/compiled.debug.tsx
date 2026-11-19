/* eslint-disable */
import { combineStyle, type StyleProp } from '@fluentic/style';
import { createExtractedSlot, createExtractedTheme, createExtractedToken } from '@fluentic/style/entry/prod/extract';
const tokens = {
  'color': {
    'bg': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--color--bg',
      '#ffffff',
      null,
      'color--bg',
      '--token-color--bg-c0wb4k0',
    ),
    'text': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--color--text',
      '#17201b',
      null,
      'color--text',
      '--token-color--text-b9nf5kc',
    ),
    'muted': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--color--muted',
      '#5f6f67',
      null,
      'color--muted',
      '--token-color--muted-hr8l6a0',
    ),
    'accent': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--color--accent',
      '#0f766e',
      null,
      'color--accent',
      '--token-color--accent-bhydlup',
    ),
    'accentText': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--color--accentText',
      '#ffffff',
      null,
      'color--accentText',
      '--token-color--accentText-be1epma',
    ),
  },
  'radius': {
    'card': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--radius--card',
      14,
      null,
      'radius--card',
      '--token-radius--card-svgtds0',
    ),
    'pill': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--radius--pill',
      999,
      null,
      'radius--pill',
      '--token-radius--pill-bf7bmed',
    ),
  },
  'shadow': {
    'card': /*#__PURE__*/ createExtractedToken(
      'tokens-jde1gk0--shadow--card',
      '0 18px 40px rgba(34, 42, 37, 0.08)',
      null,
      'shadow--card',
      '--token-shadow--card-c0d5yq0',
    ),
  },
};
const lightTheme = createExtractedTheme('15x3t4k', 'theme-bdybgxr');
const darkTheme = createExtractedTheme('17quq42', 'theme-hl8zs80');
const styles = {
  card: createExtractedSlot('1813flw', [
    ['mwx9540', 'background-color--bbwzet1', [1, '--var-bj92ohf', tokens.color.bg, 1]],
    ['rykr7b0', 'border--b3cpjgx'],
    ['109h4xq', 'border-color--bjteo6h', [1, '--var-b02f5sx', tokens.color.accent, 1]],
    ['1aeebut', 'radius--dzkss80', [1, '--var-uo62oq0', tokens.radius.card, 1]],
    ['1qi6vb6', 'box-shadow--dcjjn80', [1, '--var-cw5jiv0', tokens.shadow.card, 1]],
    ['18q1j80', 'color--bugfk5o', [1, '--var-bww5idk', tokens.color.text, 1]],
    ['1nca60l', 'display-grid--jgp0up0'],
    ['1phh07j', 'gap--uazf000'],
    ['14q2jir', 'max-width--bbrhkou'],
    ['1ffb9qm', 'padding--zll9qj0'],
  ]),
  eyebrow: createExtractedSlot('1yuulhs', [
    ['18q1j80', 'color--jwnm900', [1, '--var-iax9200', tokens.color.accent, 1]],
    ['1ut2mip', 'font-size--cwxf320'],
    ['1pkhne0', 'font-800--kfbuc00'],
    ['iah4wu0', 'letter-spacing--tckx800'],
    ['nde9im0', 'text-transform-uppercase--bfgv0j6'],
  ]),
  title: createExtractedSlot('12jpkrm', [
    ['18q1j80', 'color--bocjfhb', [1, '--var-s9eo8d0', tokens.color.text, 1]],
    ['1ut2mip', 'font-size--w6vmo30'],
    ['1pkhne0', 'font-800--kfbuc00'],
    ['670umo0', 'line-height--xwgj4c0'],
    ['1r0p66z', 'margin--fy69b50'],
  ]),
  body: createExtractedSlot('1o6sn49', [
    ['18q1j80', 'color--bjlxhh9', [1, '--var-qmj3wr0', tokens.color.muted, 1]],
    ['1ut2mip', 'font-size--bpi985b'],
    ['670umo0', 'line-height--b155prj'],
    ['1r0p66z', 'margin--fy69b50'],
  ]),
  action: createExtractedSlot('hkvtdd0', [
    ['mwx9540', 'background-color--etskod0', [1, '--var-ve52860', tokens.color.accent, 1]],
    ['1aeebut', 'radius--pz8qtg0', [1, '--var-b587sfx', tokens.radius.pill, 1]],
    ['18q1j80', 'color--x9hbbg0', [1, '--var-f7dii40', tokens.color.accentText, 1]],
    ['1ut2mip', 'font-size--baks490'],
    ['1pkhne0', 'font-800--kfbuc00'],
    ['1ffb9qm', 'padding--b8kk8ny'],
    ['1hznesf', 'width-fit-content--hjsx5a0'],
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
