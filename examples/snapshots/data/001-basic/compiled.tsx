/* eslint-disable */
import { bindScope, combineStyle, createToken, style } from '@fluentic/style';
import {
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedStyleMerge,
  createExtractedToken,
  withTokens,
} from '@fluentic/style/entry/prod/extract';
import bg from './bg.png';
import { ContainerWidth, Fonts, IconAlpha } from './constants';
const _fluenticToken2 = createExtractedToken('tqsn1c0', null);
const _fluenticToken = createExtractedToken('u0s8qb0', null);
const _fluenticStyle = createExtractedStyle([['1ffb9qm', 'jhzi820'], ['69nyj00', 'bp0cx55']]);
const compact = !!(window as any)['compact'];
const density = compact ? 8 : 12;
const dynamicStyle = createExtractedStyle([['1phh07j', 'bm8z8e7', [1, '--var-iafi210', density, 1]], [
  '1ffb9qm',
  'l9tsy00',
  [1, '--var-ba7b46t', density * 2, 1],
]]);
const _fluenticStyle2 = createExtractedStyleMerge([['18q1j80', 'b7lpaos', [1, '--var-jg49df0', _fluenticToken, 1]], [
  'mwx9540',
  'h44xih0',
], ['1omoamz', 'bh7gltt', [1, '--var-bjwbpju', _fluenticToken2, 1]]], dynamicStyle);
enum TextTone {
  Danger = 'red',
  Hover = 'blue',
  Mobile = 'green',
}
const token = createToken('blue', 'token-1jb1zmc');
const containerHover = style.raw({
  gap: density * 3,
  backgroundColor: token,
});
const styles = {
  container: createExtractedSlot('pjpd9n0', [
    ['86n2vs0', 'bnqkewy'],
    ['1f7w5u4', 'bcn0isx'],
    ['1c56qtq', 'gyv9el0'],
    ['1phh07j', 'bn5yexc', [1, '--var-lh6v6q0', density * 4, 1]],
    ['dz1dcy0', 'bkx1zo2'],
    ['1tysl6a', 'p8rx110', [1, '--var-cap3zp0', density * 3, 1]],
    ['d1c10h0', 'bkqifxz', [1, '--var-cap3zp0', createExtractedToken('token-1jb1zmc', 'blue', null), 1]],
  ]),
  container2: createExtractedSlot('ho4zce0', [['1hznesf', 'bil4cl0'], ['1nca60l', 'bf72i63'], ['dz1dcy0', 'bej6r0o']]),
  text: createExtractedSlot('nmrp0v0', [['18q1j80', 'g21wjn0']]),
  icon: createExtractedSlot('irbk3e0', [['1x29z9a', 'es7atr0']]),
};
export const extraStyles = {
  container: createExtractedStyle([['mwx9540', 'by40xi9'], ['lidjx60', 'ba8jwi2', [
    1,
    '--var-npc2ze0',
    'url(' + bg + ')',
    1,
  ]]]),
};
const scope = createExtractedScope([
  [4, 'pjpd9n0', '18q1j80', 'b3wpxqo'],
  [4, 'nmrp0v0', 'rykr7b0', 'mw8s4v0'],
  [4, 'irbk3e0', 'mwx9540', 'ru9zs00'],
  [4, 'pjpd9n0', 'q06n0s0', 'ifukx00', 1],
  [4, 'pjpd9n0', '1bc09i0', 'bvnz9oa', 1],
  [4, 'nmrp0v0', 'yxz9kz0', 'h11nhl0', 1],
  [4, 'irbk3e0', '139tnz1', 'b29wp7d', 1],
  [4, 'pjpd9n0', '1g5jk8d', 'bx8q7lo'],
  [4, 'nmrp0v0', 'acncf40', 'of0pcl0'],
  [4, 'irbk3e0', '10vjqb2', 'bvggra7'],
]);
export default ({
  color = 'purple',
}: {
  color?: string;
}) => {
  const localStatic = _fluenticStyle;
  const localDynamic = withTokens(_fluenticStyle2, [_fluenticToken(color), _fluenticToken2(color)]);
  const css = combineStyle(styles, bindScope(styles.container, scope));
  const extraCss = combineStyle(extraStyles);
  console.log('containerHover:', containerHover);
  return (
    <div css={[css.container, extraCss.container, localStatic, localDynamic]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>
  );
};
