/* eslint-disable */
import { createExtractedSlot, createExtractedToken, createExtractedStyle, createExtractedScope } from "@fluentic/style/builder/extract";
import { createToken, bindScope, combineStyle } from '@fluentic/style';
import bg from './bg.png';
import { Fonts } from './constants';
const token = createToken('blue', "token-gchued0");
const styles = {
    container: createExtractedSlot("1wgvxv6", [["86n2vs0", "bnqkewy"], ["1f7w5u4", "bcn0isx"], ["1c56qtq", "gyv9el0"], ["dz1dcy0", "bkx1zo2"], ["d1c10h0", "culuz30", [1, "--token-1waypmo", createExtractedToken("token-gchued0", "blue", null)]]]),
    container2: createExtractedSlot("lbhfyy0", [["1hznesf", "bil4cl0"], ["1nca60l", "bf72i63"], ["dz1dcy0", "bej6r0o"]]),
    text: createExtractedSlot("19t1r1a", [["18q1j80", "g21wjn0"]]),
    icon: createExtractedSlot("f4dvz70", [["1x29z9a", "es7atr0"]])
};
export const extraStyles = {
    container: createExtractedStyle([["mwx9540", "by40xi9"], ["lidjx60", "blq5wbh", [1, "--token-lhc8xf0", 'url(' + bg + ')']]])
};
const scope = createExtractedScope([[4, "1wgvxv6", "18q1j80", "b3wpxqo"], [4, "19t1r1a", "rykr7b0", "mw8s4v0"], [4, "f4dvz70", "mwx9540", "ru9zs00"], [4, "1wgvxv6", "q06n0s0", "ifukx00", true], [4, "1wgvxv6", "1bc09i0", "bvnz9oa", true], [4, "19t1r1a", "yxz9kz0", "h11nhl0", true], [4, "f4dvz70", "139tnz1", "b29wp7d", true], [4, "1wgvxv6", "1g5jk8d", "bx8q7lo"], [4, "19t1r1a", "acncf40", "of0pcl0"], [4, "f4dvz70", "10vjqb2", "bvggra7"]]);
export default () => {
    const css = combineStyle(styles, bindScope(styles.container, scope));
    const extraCss = combineStyle(extraStyles);
    return <div css={[css.container, extraCss.container]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>;
};
