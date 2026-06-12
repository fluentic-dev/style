import { useCss } from '@fluentic/style';
import {
  createPrecompiledScope,
  createPrecompiledSlot,
  createPrecompiledStyle,
  createPrecompiledToken,
} from '@fluentic/style/precompile';
import bg from './bg.png';
const styles = {
  container: createPrecompiledSlot('nf96ai0', [
    ['86n2vs0', 'font-family-times-1nqkewy'],
    ['1f7w5u4', 'width--18-1cn0isx'],
    ['1c56qtq', 'display-flex-6yv9el0'],
    ['dz1dcy0', 'width:hover--20-1kx1zo2'],
    ['d1c10h0', 'bg:hover-2uluz30', [1, '--token-1waypmo', createPrecompiledToken('token-1t2wh9p', 'blue', null)]],
  ]),
  container2: createPrecompiledSlot('1qi43b6', [['1hznesf', 'width--20-bil4cl0'], ['1nca60l', 'display-none-1f72i63'], [
    'dz1dcy0',
    'width:hover--22-1ej6r0o',
  ]]),
  text: createPrecompiledSlot('3umiva0', [['18q1j80', 'color-red-g21wjn0']]),
  icon: createPrecompiledSlot('17up5e3', [['1x29z9a', 'opacity--0.5-4s7atr0']]),
};
export const extraStyles = {
  container: createPrecompiledStyle([['mwx9540', 'bg-coral-1y40xi9'], ['lidjx60', 'background-image-1lq5wbh', [
    1,
    '--token-lhc8xf0',
    'url(' + bg + ')',
  ]]]),
};
const scope = createPrecompiledScope([
  [4, 'nf96ai0', '18q1j80', 'color-pink-13wpxqo'],
  [4, '3umiva0', 'rykr7b0', 'border-pink-mw8s4v0'],
  [4, '17up5e3', 'mwx9540', 'bg-pink-ru9zs00'],
  [4, 'nf96ai0', 'q06n0s0', 'hover.width--20-8fukx00', true],
  [4, 'nf96ai0', '1bc09i0', 'hover.outline-color:active-yellow-1vnz9oa', true],
  [4, '3umiva0', 'yxz9kz0', 'hover.color-blue-711nhl0', true],
  [4, '17up5e3', '139tnz1', 'hover.opacity--0.8-129wp7d', true],
  [4, 'nf96ai0', '1g5jk8d', 'max-600px:width--16-1x8q7lo'],
  [4, '3umiva0', 'acncf40', 'max-600px:color-green-of0pcl0'],
  [4, '17up5e3', '10vjqb2', 'max-600px:opacity--0.3-1vggra7'],
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
