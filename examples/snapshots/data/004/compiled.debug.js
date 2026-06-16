/* eslint-disable */
import { combineStyle, createTokens } from '@fluentic/style';
import { createExtractedSlot, createExtractedTheme, createExtractedToken } from '@fluentic/style/builder/extract';
const _fluenticStyle = createExtractedSlot('1nqs1k5', [
  ['mwx9540', 'background-color-1v1zsd5', [
    1,
    '--token-u81w5m0',
    createExtractedToken('tokens-yi1azh0--color--bg', '#ffffff', null),
  ]],
  ['rykr7b0', 'border-13cpjgx'],
  ['109h4xq', 'border-color-1yxduwm', [
    1,
    '--token-1htrmc4',
    createExtractedToken('tokens-yi1azh0--color--accent', '#0f766e', null),
  ]],
  ['1aeebut', 'radius-1368mnh', [1, '--token-jafkrn0', createExtractedToken('tokens-yi1azh0--radius--card', 14, null)]],
  ['1qi6vb6', 'box-shadow-1j6qxux', [
    1,
    '--token-8zf4320',
    createExtractedToken('tokens-yi1azh0--shadow--card', '0 18px 40px rgba(34, 42, 37, 0.08)', null),
  ]],
  ['18q1j80', 'color-fsjz5t0', [
    1,
    '--token-9lgzph0',
    createExtractedToken('tokens-yi1azh0--color--text', '#17201b', null),
  ]],
  ['1nca60l', 'display-grid-jgp0up0'],
  ['1phh07j', 'gap-uazf000'],
  ['14q2jir', 'max-width-1brhkou'],
  ['1ffb9qm', 'padding-zll9qj0'],
]);
const _fluenticStyle2 = createExtractedSlot('189x96n', [
  ['18q1j80', 'color-nenc3m0', [
    1,
    '--token-4x74bx0',
    createExtractedToken('tokens-yi1azh0--color--accent', '#0f766e', null),
  ]],
  ['1ut2mip', 'font-size-2wxf320'],
  ['1pkhne0', 'font-kfbuc00'],
  ['iah4wu0', 'letter-spacing-tckx800'],
  ['nde9im0', 'text-transform-1fgv0j6'],
]);
const _fluenticStyle3 = createExtractedSlot('z61kej0', [
  ['18q1j80', 'color-15hs1sf', [
    1,
    '--token-1tztr4o',
    createExtractedToken('tokens-yi1azh0--color--text', '#17201b', null),
  ]],
  ['1ut2mip', 'font-size-w6vmo30'],
  ['1pkhne0', 'font-kfbuc00'],
  ['670umo0', 'line-height-xwgj4c0'],
  ['1r0p66z', 'margin-fy69b50'],
]);
const _fluenticStyle4 = createExtractedSlot('1h49c28', [
  ['18q1j80', 'color-9s3g5u0', [
    1,
    '--token-a5rina0',
    createExtractedToken('tokens-yi1azh0--color--muted', '#5f6f67', null),
  ]],
  ['1ut2mip', 'font-size-1pi985b'],
  ['670umo0', 'line-height-1155prj'],
  ['1r0p66z', 'margin-fy69b50'],
]);
const _fluenticStyle5 = createExtractedSlot('tgw3ei0', [
  ['mwx9540', 'background-color-17ao063', [
    1,
    '--token-5e5kbv0',
    createExtractedToken('tokens-yi1azh0--color--accent', '#0f766e', null),
  ]],
  ['1aeebut', 'radius-1n7igy4', [
    1,
    '--token-1uwt0vw',
    createExtractedToken('tokens-yi1azh0--radius--pill', 999, null),
  ]],
  ['18q1j80', 'color-55vlh20', [
    1,
    '--token-vk5ogd0',
    createExtractedToken('tokens-yi1azh0--color--accentText', '#ffffff', null),
  ]],
  ['1ut2mip', 'font-size-baks490'],
  ['1pkhne0', 'font-kfbuc00'],
  ['1ffb9qm', 'padding-18kk8ny'],
  ['1hznesf', 'width-hjsx5a0'],
]);
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
}, 'tokens-yi1azh0');
const lightTheme = createExtractedTheme('1mhfgcv', 'theme-h0av7f0');
const darkTheme = createExtractedTheme('aghz950', 'theme-bx655zn');
const styles = {
  card: _fluenticStyle,
  eyebrow: _fluenticStyle2,
  title: _fluenticStyle3,
  body: _fluenticStyle4,
  action: _fluenticStyle5,
};
function Preview(props) {
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
