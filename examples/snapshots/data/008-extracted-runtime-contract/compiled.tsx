/* eslint-disable */
import {
  bindScope,
  type CombinedStyleFor,
  combineScope,
  combineStyle,
  createToken,
  createTokens,
  createValues,
  getClassName,
  getToken,
  type StyleTheme,
} from '@fluentic/style';
import {
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedTheme,
  createExtractedToken,
  withTokens,
} from '@fluentic/style/entry/prod/extract';
import { mergeClassName, mergeStyle } from '@fluentic/style/entry/prod/runtime';
const _fluenticToken = createExtractedToken('12zw6g0', null);
const _fluenticToken2 = createExtractedToken('1czhvf0', null);
const accent = createToken('#2563eb', 'accent-1o50vcc');
const accentAlias = createToken(accent, 'accentAlias-b1cdp40');
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
}, 'tokens-joj22s0');
const _fluenticStyle = createExtractedStyle([['w0ni080', 'bhjx1sg', [1, '--var-vreqfj0', _fluenticToken, 1]], [
  'xoa3yu0',
  'bqsvnad',
], ['19hl1pj', 'jvs87g0', [1, '--var-f09vld0', _fluenticToken2, 1]]]);
const space = createValues(Number, ['10 | sm', '18 | md'], 'space-1avrxwk');
const tone = createValues(['#eff6ff | Soft', '#dbeafe | Active'], 'tone-6xm3z60');
const lightTheme = createExtractedTheme('r5maal0', 'theme-tof6p90');
const vividTheme = createExtractedTheme('4toaxt0', 'theme-by5mfzn');
const cardStyles = {
  root: createExtractedSlot('19pigzf', [
    ['mwx9540', 'fzx0c90', [
      1,
      '--var-u7016b0',
      createExtractedToken(
        'tokens-joj22s0--color--surface',
        '#ffffff',
        null,
        'color--surface',
        '--token-color--surface-b17qwr8',
      ),
      1,
    ]],
    ['rykr7b0', 'b3cpjgx'],
    ['109h4xq', 'bui5b8d', [
      1,
      '--var-i9z5gd0',
      createExtractedToken(
        'tokens-joj22s0--color--accent',
        '#2563eb',
        null,
        'color--accent',
        '--token-color--accent-bp94rm7',
      ),
      1,
    ]],
    ['1aeebut', 'hy0rrn0', [
      1,
      '--var-b6gq4v1',
      createExtractedToken('tokens-joj22s0--radius--panel', 18, null, 'radius--panel', '--token-radius--panel-be5nmme'),
      1,
    ]],
    ['18q1j80', 'btv6i4h', [
      1,
      '--var-wmnena0',
      createExtractedToken(
        'tokens-joj22s0--color--text',
        '#172033',
        null,
        'color--text',
        '--token-color--text-kk0tpy0',
      ),
      1,
    ]],
    ['1nca60l', 'jgp0up0'],
    ['1phh07j', 'b3nre13', [
      1,
      '--var-bkkqp80',
      createExtractedToken('space-1avrxwk--gsyhks0', 10, null, 'space--sm', '--token-space--sm-betrnld'),
      1,
    ]],
    ['1ffb9qm', 'b81090p', [
      1,
      '--var-nr0cnd0',
      createExtractedToken('space-1avrxwk--bjhstt0', 18, null, 'space--md', '--token-space--md-tlp1ht0'),
      1,
    ]],
    ['d1c10h0', 'bbimfhr', [
      1,
      '--var-bftb5iz',
      createExtractedToken('tone-6xm3z60--1dqozn0', '#eff6ff', null, 'tone--Soft', '--token-tone--Soft-nhhpaz0'),
      1,
    ]],
  ]),
  title: createExtractedSlot('17ubvh5', [
    ['18q1j80', 'b58xz2m', [
      1,
      '--var-b82qjwe',
      createExtractedToken(
        'tokens-joj22s0--color--text',
        '#172033',
        null,
        'color--text',
        '--token-color--text-kk0tpy0',
      ),
      1,
    ]],
    ['1ut2mip', 'dox5r50'],
    ['1pkhne0', 'kfbuc00'],
    ['1r0p66z', 'fy69b50'],
  ]),
  badge: createExtractedSlot('7p9b740', [
    ['mwx9540', 'bkxzgvi', [
      1,
      '--var-bkggln0',
      createExtractedToken(
        'tokens-joj22s0--color--accent',
        '#2563eb',
        null,
        'color--accent',
        '--token-color--accent-bp94rm7',
      ),
      1,
    ]],
    ['1aeebut', 'bc2df5r', [
      1,
      '--var-b2sn26q',
      createExtractedToken('tokens-joj22s0--radius--pill', 999, null, 'radius--pill', '--token-radius--pill-iefqc30'),
      1,
    ]],
    ['18q1j80', 'bfko2p9'],
    ['1ut2mip', 'cwxf320'],
    ['1pkhne0', 'bs1kyyx'],
    ['1ffb9qm', 'mgzjey0'],
    ['1hznesf', 'hjsx5a0'],
  ]),
};
const activeScope = createExtractedScope([[4, '19pigzf', '1qi6vb6', 'jvi87p0'], [4, '7p9b740', 'mwx9540', 'cbhig30', [
  1,
  '--var-gpi4cr0',
  createExtractedToken('accent-1o50vcc', '#2563eb', null, 'accent', '--token-accent-b8ztlsd'),
  1,
]], [4, '19pigzf', 'eoxpgd0', 'bbthf2i', [
  1,
  '--var-b4n6vpa',
  createExtractedToken(
    'accentAlias-b1cdp40',
    '#2563eb',
    createExtractedToken('accent-1o50vcc', '#2563eb', null, 'accent', '--token-accent-b8ztlsd'),
    'accentAlias',
    '--token-accentAlias-bttzc66',
  ),
  1,
], 1], [4, '17ubvh5', 'yxz9kz0', 'bhna0yz', [
  1,
  '--var-buaj12r',
  createExtractedToken(
    'tokens-joj22s0--color--accent',
    '#2563eb',
    null,
    'color--accent',
    '--token-color--accent-bp94rm7',
  ),
  1,
], 1]]);
const combineCard = combineStyle.for(cardStyles);
type CardStyle = CombinedStyleFor<typeof combineCard>;
function ContractCard(props: {
  active?: boolean;
  styles?: CardStyle;
  theme?: StyleTheme;
}) {
  const theme = combineScope(lightTheme, vividTheme, activeScope, props.theme);
  const css = combineCard(
    props.styles,
    bindScope(cardStyles.root, theme),
    props.active && cardStyles.root({
      backgroundColor: tone('#dbeafe | Active'),
    }),
  );
  const dynamicFrame = withTokens(_fluenticStyle, [
    _fluenticToken(props.active ? accent : tokens.color.muted),
    _fluenticToken2(props.active ? 2 : 1),
  ]);
  const rootProps = getClassName([css.root, dynamicFrame], {
    className: mergeClassName(['contract-card', props.active && 'is-active']),
    style: mergeStyle([
      {
        '--contract-accent': String(getToken(tokens.color.accent)),
      },
      props.active && {
        '--contract-state': 'active',
      },
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
      <ContractCard styles={scoped} active />
      <output>{String(getToken(tokens.color.muted))}</output>
    </main>
  );
}
