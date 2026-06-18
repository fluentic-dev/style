/* eslint-disable */
import { createExtractedSlot, createExtractedToken, createExtractedStyle, withTokens, createExtractedScope } from "@fluentic/style/entry/prod/extract";
import { bindScope, combineStyle, createToken } from '@fluentic/style';
import bg from './bg.png';
import { Fonts } from './constants';
const _fluenticStyle = createExtractedSlot("exk8bp0", [["86n2vs0", "font-family-times-bk33r00"], ["1f7w5u4", "width-d3rssn0"], ["1c56qtq", "display-flex-b4d2b3w"], ["dz1dcy0", "width-hover-iypmcb0"], ["d1c10h0", "background-color-hover-xwndrc0", [1, "--var-brjxzfr", createExtractedToken("token-1jb1zmc", "blue", null), 1]]]);
const _fluenticStyle2 = createExtractedSlot("1283wpb", [["1hznesf", "width-rb3ea60"], ["1nca60l", "display-none-bu9x92t"], ["dz1dcy0", "width-hover-bxsbosn"]]);
const _fluenticStyle3 = createExtractedSlot("1bxj5mt", [["18q1j80", "color-red-edc9wv0"]]);
const _fluenticStyle4 = createExtractedSlot("1q4e210", [["1x29z9a", "opacity-b6dkdy0"]]);
const _fluenticToken = createExtractedToken("u0s8qb0", null);
const _fluenticStyle5 = createExtractedStyle([["mwx9540", "background-color-coral-gncb830"], ["lidjx60", "background-image-bfbvbk7", [1, "--var-nu9tao0", _fluenticToken, 1]]]);
const _fluenticStyle6 = createExtractedScope([[4, "exk8bp0", "18q1j80", "color-pink-b12pukf"], [4, "1bxj5mt", "rykr7b0", "border-pink-bpl0n30"], [4, "1q4e210", "mwx9540", "background-color-pink-vr50690"], [4, "exk8bp0", "q06n0s0", "hover-width-bhkn4c2", true], [4, "exk8bp0", "1bc09i0", "hover-outline-color-active-yellow-jvtcnq0", true], [4, "1bxj5mt", "yxz9kz0", "hover-color-blue-hvsmdy0", true], [4, "1q4e210", "139tnz1", "hover-opacity-bp5k2nd", true], [4, "exk8bp0", "1g5jk8d", "max-600px-width-jp9itr0"], [4, "1bxj5mt", "acncf40", "max-600px-color-green-bhrg44d"], [4, "1q4e210", "10vjqb2", "max-600px-opacity-baxdw2g"]]);
const token = createToken('blue', "token-1jb1zmc");
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
