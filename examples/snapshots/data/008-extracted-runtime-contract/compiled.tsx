/* eslint-disable */
import {
  bindScope,
  type CombinedStyleFor,
  combineStyle,
  createToken,
  createTokens,
  createValues,
  getClassName,
  getToken,
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
import type { CSSProperties } from 'react';
const _fluenticToken = createExtractedToken('12zw6g0', null);
const _fluenticToken2 = createExtractedToken('1czhvf0', null);
const _fluenticToken3 = createExtractedToken('1mz3ke0', null);
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
const space = createValues(Number, ['10 | sm', '18 | md'], 'space-1avrxwk');
const tone = createValues(['#eff6ff | Soft', '#dbeafe | Active'], 'tone-6xm3z60');
const _fluenticStyle = createExtractedStyle([
  ['mwx9540', 'esjff10', [1, '--var-bn71p76', _fluenticToken, 1]],
  ['w0ni080', 'gbcy9e0', [1, '--var-lyv3m30', _fluenticToken2, 1]],
  ['xoa3yu0', 'bqsvnad'],
  ['19hl1pj', 'bwnih5l', [1, '--var-bbshncd', _fluenticToken3, 1]],
]);
const lightTheme = createExtractedTheme('w8bclg0', 'theme-fy1rs00');
const vividTheme = createExtractedTheme('13l4svn', 'theme-bkk1rza');
const cardStyles = {
  root: createExtractedSlot('stlvoq0', [
    ['mwx9540', 'l8v48z0', [
      1,
      '--var-bsqc2qs',
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
    ['109h4xq', 'jap97m0', [
      1,
      '--var-ifwf8m0',
      createExtractedToken(
        'tokens-joj22s0--color--accent',
        '#2563eb',
        null,
        'color--accent',
        '--token-color--accent-bp94rm7',
      ),
      1,
    ]],
    ['1aeebut', 'zacg300', [
      1,
      '--var-i9z5gd0',
      createExtractedToken('tokens-joj22s0--radius--panel', 18, null, 'radius--panel', '--token-radius--panel-be5nmme'),
      1,
    ]],
    ['18q1j80', 'jjgp2c0', [
      1,
      '--var-b6gq4v1',
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
    ['1phh07j', 'bcel19l', [
      1,
      '--var-bpy8cqn',
      createExtractedToken('space-1avrxwk--gsyhks0', 10, null, 'space--sm', '--token-space--sm-betrnld'),
      1,
    ]],
    ['1ffb9qm', 'ba4ezr5', [
      1,
      '--var-bkkqp80',
      createExtractedToken('space-1avrxwk--bjhstt0', 18, null, 'space--md', '--token-space--md-tlp1ht0'),
      1,
    ]],
    ['d1c10h0', 'bgpno04', [
      1,
      '--var-icr9j60',
      createExtractedToken('tone-6xm3z60--1dqozn0', '#eff6ff', null, 'tone--Soft', '--token-tone--Soft-nhhpaz0'),
      1,
    ]],
  ]),
  title: createExtractedSlot('j9kqsg0', [
    ['18q1j80', 'bxjolyp', [
      1,
      '--var-jin2qd0',
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
  badge: createExtractedSlot('12xwdn5', [
    ['mwx9540', 'b13bcuo', [
      1,
      '--var-bqqqcrg',
      createExtractedToken(
        'tokens-joj22s0--color--accent',
        '#2563eb',
        null,
        'color--accent',
        '--token-color--accent-bp94rm7',
      ),
      1,
    ]],
    ['1aeebut', 'bmwkcok', [
      1,
      '--var-bkggln0',
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
const activeScope = createExtractedScope([[4, 'stlvoq0', '1qi6vb6', 'jvi87p0'], [4, '12xwdn5', 'mwx9540', 'xt60zf0', [
  1,
  '--var-bb918k0',
  createExtractedToken('accent-1o50vcc', '#2563eb', null, 'accent', '--token-accent-b8ztlsd'),
  1,
]], [4, 'stlvoq0', 'eoxpgd0', 'bpzewei', [
  1,
  '--var-bg25r5r',
  createExtractedToken(
    'accentAlias-b1cdp40',
    '#2563eb',
    createExtractedToken('accent-1o50vcc', '#2563eb', null, 'accent', '--token-accent-b8ztlsd'),
    'accentAlias',
    '--token-accentAlias-bttzc66',
  ),
  1,
], 1], [4, 'j9kqsg0', 'yxz9kz0', 'bxe9apj', [
  1,
  '--var-bow9xyk',
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
}) {
  const css = combineCard(props.styles, bindScope(cardStyles.root, activeScope));
  const dynamicFrame = withTokens(_fluenticStyle, [
    _fluenticToken(props.active ? tone('#dbeafe | Active') : tokens.color.surface),
    _fluenticToken2(props.active ? accent : tokens.color.muted),
    _fluenticToken3(props.active ? 2 : 1),
  ]);
  const rootProps = getClassName([css.root, dynamicFrame], {
    className: mergeClassName(['contract-card', props.active && 'is-active']),
    style: mergeStyle([
      {
        '--contract-accent': String(getToken(tokens.color.accent)),
      } as CSSProperties,
      props.active && {
        '--contract-state': 'active',
      } as CSSProperties,
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
