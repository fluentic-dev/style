/* eslint-disable */
import { createExtractedSlot, createExtractedToken, createExtractedStyle, withTokens, createExtractedScope } from "@fluentic/style/builder/extract";
import { bindScope, combineStyle, createToken } from '@fluentic/style';
import bg from './bg.png';
import { Fonts } from './constants';
const _fluenticStyle = createExtractedSlot("1wgvxv6", [["86n2vs0", "font-family-times-1nqkewy"], ["1f7w5u4", "width-1cn0isx"], ["1c56qtq", "display-flex-6yv9el0"], ["dz1dcy0", "width-hover-1kx1zo2"], ["d1c10h0", "background-color-hover-8vcznp0", [1, "--token-1waypmo", createExtractedToken("token-gchued0", "blue", null)]]]);
const _fluenticStyle2 = createExtractedSlot("lbhfyy0", [["1hznesf", "width-bil4cl0"], ["1nca60l", "display-none-1f72i63"], ["dz1dcy0", "width-hover-1ej6r0o"]]);
const _fluenticStyle3 = createExtractedSlot("19t1r1a", [["18q1j80", "color-red-g21wjn0"]]);
const _fluenticStyle4 = createExtractedSlot("f4dvz70", [["1x29z9a", "opacity-4s7atr0"]]);
const _fluenticToken = createExtractedToken("14afhcu", null);
const _fluenticStyle5 = createExtractedStyle([["mwx9540", "background-color-coral-1y40xi9"], ["lidjx60", "background-image-1lq5wbh", [1, "--token-lhc8xf0", _fluenticToken]]]);
const _fluenticStyle6 = createExtractedScope([[4, "1wgvxv6", "18q1j80", "color-pink-13wpxqo"], [4, "19t1r1a", "rykr7b0", "border-pink-mw8s4v0"], [4, "f4dvz70", "mwx9540", "background-color-pink-ru9zs00"], [4, "1wgvxv6", "q06n0s0", "hover-width-8fukx00", true], [4, "1wgvxv6", "1bc09i0", "hover-outline-color-active-yellow-1vnz9oa", true], [4, "19t1r1a", "yxz9kz0", "hover-color-blue-711nhl0", true], [4, "f4dvz70", "139tnz1", "hover-opacity-129wp7d", true], [4, "1wgvxv6", "1g5jk8d", "max-600px-width-1x8q7lo"], [4, "19t1r1a", "acncf40", "max-600px-color-green-of0pcl0"], [4, "f4dvz70", "10vjqb2", "max-600px-opacity-1vggra7"]]);
const token = createToken('blue', "token-gchued0");
const styles = {
    container: _fluenticStyle,
    container2: _fluenticStyle2,
    text: _fluenticStyle3,
    icon: _fluenticStyle4
};
export const extraStyles = {
    container: withTokens(_fluenticStyle5, [_fluenticToken('url(' + bg + ')')])
};
const scope = _fluenticStyle6;
export default () => {
    const css = combineStyle(styles, bindScope(styles.container, scope));
    const extraCss = combineStyle(extraStyles);
    return <div css={[css.container, extraCss.container]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>;
};
