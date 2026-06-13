/* eslint-disable */
import { createExtractedSlot, createExtractedToken, createExtractedStyle, createExtractedScope } from "@fluentic/style/builder/extract";
import { createToken, bindScope, combineStyle } from '@fluentic/style';
import bg from './bg.png';
import { Fonts } from './constants';
const token = createToken('blue', "token-gchued0");
const styles = {
    container: createExtractedSlot("1wgvxv6", [["86n2vs0", "font-family-times-1nqkewy"], ["1f7w5u4", "width-1cn0isx"], ["1c56qtq", "display-flex-6yv9el0"], ["dz1dcy0", "width-hover-1kx1zo2"], ["d1c10h0", "bg-hover-2uluz30", [1, "--token-1waypmo", createExtractedToken("token-gchued0", "blue", null)]]]),
    container2: createExtractedSlot("lbhfyy0", [["1hznesf", "width-bil4cl0"], ["1nca60l", "display-none-1f72i63"], ["dz1dcy0", "width-hover-1ej6r0o"]]),
    text: createExtractedSlot("19t1r1a", [["18q1j80", "color-red-g21wjn0"]]),
    icon: createExtractedSlot("f4dvz70", [["1x29z9a", "opacity-4s7atr0"]])
};
export const extraStyles = {
    container: createExtractedStyle([["mwx9540", "bg-coral-1y40xi9"], ["lidjx60", "background-image-1lq5wbh", [1, "--token-lhc8xf0", 'url(' + bg + ')']]])
};
const scope = createExtractedScope([[4, "1wgvxv6", "18q1j80", "color-pink-13wpxqo"], [4, "19t1r1a", "rykr7b0", "border-pink-mw8s4v0"], [4, "f4dvz70", "mwx9540", "bg-pink-ru9zs00"], [4, "1wgvxv6", "q06n0s0", "hover-width-8fukx00", true], [4, "1wgvxv6", "1bc09i0", "hover-outline-color-active-yellow-1vnz9oa", true], [4, "19t1r1a", "yxz9kz0", "hover-color-blue-711nhl0", true], [4, "f4dvz70", "139tnz1", "hover-opacity-129wp7d", true], [4, "1wgvxv6", "1g5jk8d", "max-600px-width-1x8q7lo"], [4, "19t1r1a", "acncf40", "max-600px-color-green-of0pcl0"], [4, "f4dvz70", "10vjqb2", "max-600px-opacity-1vggra7"]]);
export default () => {
    const css = combineStyle(styles, bindScope(styles.container, scope));
    const extraCss = combineStyle(extraStyles);
    return <div css={[css.container, extraCss.container]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>;
};
