/* eslint-disable */
import { createExtractedStyle, createExtractedSlot, createExtractedToken, createExtractedScope, createExtractedStyleMerge, withTokens } from "@fluentic/style/entry/prod/extract";
import { bindScope, combineStyle, createToken, style } from '@fluentic/style';
import bg from './bg.png';
import { ContainerWidth, Fonts, IconAlpha } from './constants';
const _fluenticToken2 = createExtractedToken("tqsn1c0", null);
const _fluenticToken = createExtractedToken("u0s8qb0", null);
const _fluenticStyle = createExtractedStyle([["1ffb9qm", "padding-bjwfq6q"], ["69nyj00", "padding-hover-bh5secb"]]);
const compact = !!(window as any)['compact'];
const density = compact ? 8 : 12;
const dynamicStyle = createExtractedStyle([["1phh07j", "gap-i7zidj0", [1, "--var-iafi210", density, 1]], ["1ffb9qm", "padding-nnpbz40", [1, "--var-ba7b46t", density * 2, 1]]]);
const _fluenticStyle2 = createExtractedStyleMerge([["18q1j80", "color-be29slu", [1, "--var-jg49df0", _fluenticToken, 1]], ["mwx9540", "background-color-white-b302ar4"], ["1omoamz", "border-color-hover-bioffha", [1, "--var-bjwbpju", _fluenticToken2, 1]]], dynamicStyle);
enum TextTone {
  Danger = 'red',
  Hover = 'blue',
  Mobile = 'green',
}
const token = createToken('blue', "token-1jb1zmc");
const containerHover = style.raw({
  gap: density * 3,
  backgroundColor: token
});
const styles = {
  container: createExtractedSlot("pjpd9n0", [["86n2vs0", "font-family-times-bh6sooa"], ["1f7w5u4", "width-bg3jsj8"], ["1c56qtq", "display-flex-bk1kjox"], ["1phh07j", "gap-badsgnp", [1, "--var-lh6v6q0", density * 4, 1]], ["dz1dcy0", "width-hover-b2h7o2d"], ["1tysl6a", "gap-hover-bhikf0l", [1, "--var-cap3zp0", density * 3, 1]], ["d1c10h0", "background-color-hover-bhw6uzz", [1, "--var-cap3zp0", createExtractedToken("token-1jb1zmc", "blue", null), 1]]]),
  container2: createExtractedSlot("ho4zce0", [["1hznesf", "width-buon3mh"], ["1nca60l", "display-none-bhqaive"], ["dz1dcy0", "width-hover-tcygwp0"]]),
  text: createExtractedSlot("nmrp0v0", [["18q1j80", "color-red-bb9v15p"]]),
  icon: createExtractedSlot("irbk3e0", [["1x29z9a", "opacity-b7c68l1"]])
};
export const extraStyles = {
  container: createExtractedStyle([["mwx9540", "background-color-coral-b5gfi79"], ["lidjx60", "background-image-bgpbm97", [1, "--var-npc2ze0", 'url(' + bg + ')', 1]]])
};
const scope = createExtractedScope([[4, "pjpd9n0", "18q1j80", "color-pink-vz3qz90"], [4, "nmrp0v0", "rykr7b0", "border-pink-mby7f50"], [4, "irbk3e0", "mwx9540", "background-color-pink-bxqz2c8"], [4, "pjpd9n0", "q06n0s0", "hover-width-g3m8co0", 1], [4, "pjpd9n0", "1bc09i0", "hover-outline-color-active-yellow-beaqvf8", 1], [4, "nmrp0v0", "yxz9kz0", "hover-color-blue-fyds800", 1], [4, "irbk3e0", "139tnz1", "hover-opacity-jvsghe0", 1], [4, "pjpd9n0", "1g5jk8d", "max-600px-width-b393o3d"], [4, "nmrp0v0", "acncf40", "max-600px-color-green-bin7rdb"], [4, "irbk3e0", "10vjqb2", "max-600px-opacity-e19pu10"]]);
export default ({
  color = 'purple'
}: {
  color?: string;
}) => {
  const localStatic = _fluenticStyle;
  const localDynamic = withTokens(_fluenticStyle2, [_fluenticToken(color), _fluenticToken2(color)]);
  const css = combineStyle(styles, bindScope(styles.container, scope));
  const extraCss = combineStyle(extraStyles);
  console.log('containerHover:', containerHover);
  return <div css={[css.container, extraCss.container, localStatic, localDynamic]}>
      <div css={css.text}>text</div>
      <div css={css.icon}>icon</div>
    </div>;
};