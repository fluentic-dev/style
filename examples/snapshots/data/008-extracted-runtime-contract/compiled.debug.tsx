/* eslint-disable */
import { bindScope, type CombinedStyleFor, combineStyle, getClassName, getToken } from '@fluentic/style';
import {
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedTheme,
  createExtractedToken,
  createExtractedValues,
  withTokens,
} from '@fluentic/style/entry/prod/extract';
import { mergeClassName, mergeStyle } from '@fluentic/style/entry/prod/runtime';
import type { CSSProperties } from 'react';
const _fluenticToken = createExtractedToken('12zw6g0', null);
const _fluenticToken2 = createExtractedToken('1czhvf0', null);
const _fluenticToken3 = createExtractedToken('1mz3ke0', null);
const accent = /*#__PURE__*/ createExtractedToken(
  'accent-1o50vcc',
  '#2563eb',
  null,
  'accent',
  '--token-accent-b8ztlsd',
);
const accentAlias = /*#__PURE__*/ createExtractedToken(
  'accentAlias-b1cdp40',
  '#2563eb',
  accent,
  'accentAlias',
  '--token-accentAlias-bttzc66',
);
const tokens = {
  'color': {
    'surface': /*#__PURE__*/ createExtractedToken(
      'tokens-joj22s0--color--surface',
      '#ffffff',
      null,
      'color--surface',
      '--token-color--surface-b17qwr8',
    ),
    'text': /*#__PURE__*/ createExtractedToken(
      'tokens-joj22s0--color--text',
      '#172033',
      null,
      'color--text',
      '--token-color--text-kk0tpy0',
    ),
    'muted': /*#__PURE__*/ createExtractedToken(
      'tokens-joj22s0--color--muted',
      '#64748b',
      null,
      'color--muted',
      '--token-color--muted-jeweu00',
    ),
    'accent': /*#__PURE__*/ createExtractedToken(
      'tokens-joj22s0--color--accent',
      '#2563eb',
      null,
      'color--accent',
      '--token-color--accent-bp94rm7',
    ),
  },
  'radius': {
    'panel': /*#__PURE__*/ createExtractedToken(
      'tokens-joj22s0--radius--panel',
      18,
      null,
      'radius--panel',
      '--token-radius--panel-be5nmme',
    ),
    'pill': /*#__PURE__*/ createExtractedToken(
      'tokens-joj22s0--radius--pill',
      999,
      null,
      'radius--pill',
      '--token-radius--pill-iefqc30',
    ),
  },
};
const space = /*#__PURE__*/ createExtractedValues([[
  '10 | sm',
  createExtractedToken('space-1avrxwk--gsyhks0', 10, null, 'space--sm', '--token-space--sm-betrnld'),
], ['18 | md', createExtractedToken('space-1avrxwk--bjhstt0', 18, null, 'space--md', '--token-space--md-tlp1ht0')]]);
const tone = /*#__PURE__*/ createExtractedValues([[
  '#eff6ff | Soft',
  createExtractedToken('tone-6xm3z60--1dqozn0', '#eff6ff', null, 'tone--Soft', '--token-tone--Soft-nhhpaz0'),
], [
  '#dbeafe | Active',
  createExtractedToken('tone-6xm3z60--26fvif0', '#dbeafe', null, 'tone--Active', '--token-tone--Active-bkp0xn9'),
]]);
const _fluenticStyle = createExtractedStyle([
  ['mwx9540', 'background-color--esjff10', [1, '--var-bn71p76', _fluenticToken, 1]],
  ['w0ni080', 'outline-color--gbcy9e0', [1, '--var-lyv3m30', _fluenticToken2, 1]],
  ['xoa3yu0', 'outline-style-solid--bqsvnad'],
  ['19hl1pj', 'outline-width--bwnih5l', [1, '--var-bbshncd', _fluenticToken3, 1]],
]);
const lightTheme = createExtractedTheme('w8bclg0', 'theme-fy1rs00');
const vividTheme = createExtractedTheme('13l4svn', 'theme-bkk1rza');
const cardStyles = {
  root: createExtractedSlot('stlvoq0', [
    ['mwx9540', 'background-color--l8v48z0', [1, '--var-bsqc2qs', tokens.color.surface, 1]],
    ['rykr7b0', 'border--b3cpjgx'],
    ['109h4xq', 'border-color--jap97m0', [1, '--var-ifwf8m0', tokens.color.accent, 1]],
    ['1aeebut', 'radius--zacg300', [1, '--var-i9z5gd0', tokens.radius.panel, 1]],
    ['18q1j80', 'color--jjgp2c0', [1, '--var-b6gq4v1', tokens.color.text, 1]],
    ['1nca60l', 'display-grid--jgp0up0'],
    ['1phh07j', 'gap--bcel19l', [1, '--var-bpy8cqn', space('10 | sm'), 1]],
    ['1ffb9qm', 'padding--ba4ezr5', [1, '--var-bkkqp80', space('18 | md'), 1]],
    ['d1c10h0', 'background-color-hover--bgpno04', [1, '--var-icr9j60', tone('#eff6ff | Soft'), 1]],
  ]),
  title: createExtractedSlot('j9kqsg0', [
    ['18q1j80', 'color--bxjolyp', [1, '--var-jin2qd0', tokens.color.text, 1]],
    ['1ut2mip', 'font-size--dox5r50'],
    ['1pkhne0', 'font-800--kfbuc00'],
    ['1r0p66z', 'margin--fy69b50'],
  ]),
  badge: createExtractedSlot('12xwdn5', [
    ['mwx9540', 'background-color--b13bcuo', [1, '--var-bqqqcrg', tokens.color.accent, 1]],
    ['1aeebut', 'radius--bmwkcok', [1, '--var-bkggln0', tokens.radius.pill, 1]],
    ['18q1j80', 'color--bfko2p9'],
    ['1ut2mip', 'font-size--cwxf320'],
    ['1pkhne0', 'font-700--bs1kyyx'],
    ['1ffb9qm', 'padding--mgzjey0'],
    ['1hznesf', 'width-fit-content--hjsx5a0'],
  ]),
};
const activeScope = createExtractedScope([
  [4, 'stlvoq0', '1qi6vb6', 'box-shadow--jvi87p0'],
  [4, '12xwdn5', 'mwx9540', 'background-color--xt60zf0', [1, '--var-bb918k0', accent, 1]],
  [4, 'stlvoq0', 'eoxpgd0', 'hover-border-color--bpzewei', [1, '--var-bg25r5r', accentAlias, 1], 1],
  [4, 'j9kqsg0', 'yxz9kz0', 'hover-color--bxe9apj', [1, '--var-bow9xyk', tokens.color.accent, 1], 1],
]);
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
