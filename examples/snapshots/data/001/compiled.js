import { useCss } from '@fluentic/style';
import {
  createPrecompiledScope,
  createPrecompiledSlot,
  createPrecompiledStyle,
  createPrecompiledToken,
} from '@fluentic/style/precompile';
import bg from './bg.png';
const styles = {
  container: createPrecompiledSlot('nf96ai0', [['86n2vs0', 'bnqkewy'], ['1f7w5u4', 'bcn0isx'], ['1c56qtq', 'gyv9el0'], [
    'dz1dcy0',
    'bkx1zo2',
  ], ['d1c10h0', 'culuz30', [1, '--token-1waypmo', createPrecompiledToken('token-1t2wh9p', 'blue', null)]]]),
  container2: createPrecompiledSlot('1qi43b6', [['1hznesf', 'bil4cl0'], ['1nca60l', 'bf72i63'], [
    'dz1dcy0',
    'bej6r0o',
  ]]),
  text: createPrecompiledSlot('3umiva0', [['18q1j80', 'g21wjn0']]),
  icon: createPrecompiledSlot('17up5e3', [['1x29z9a', 'es7atr0']]),
};
export const extraStyles = {
  container: createPrecompiledStyle([['mwx9540', 'by40xi9'], ['lidjx60', 'blq5wbh', [
    1,
    '--token-lhc8xf0',
    'url(' + bg + ')',
  ]]]),
};
const scope = createPrecompiledScope([
  [4, 'nf96ai0', '18q1j80', 'b3wpxqo'],
  [4, '3umiva0', 'rykr7b0', 'mw8s4v0'],
  [4, '17up5e3', 'mwx9540', 'ru9zs00'],
  [4, 'nf96ai0', 'q06n0s0', 'ifukx00', true],
  [4, 'nf96ai0', '1bc09i0', 'bvnz9oa', true],
  [4, '3umiva0', 'yxz9kz0', 'h11nhl0', true],
  [4, '17up5e3', '139tnz1', 'b29wp7d', true],
  [4, 'nf96ai0', '1g5jk8d', 'bx8q7lo'],
  [4, '3umiva0', 'acncf40', 'of0pcl0'],
  [4, '17up5e3', '10vjqb2', 'bvggra7'],
]);
export default () => {
  const css = useCss(styles, scope(styles.container));
  const extraCss = useCss(extraStyles);
  return (
    <div css={[css.container, extraCss.container]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>
  );
};
