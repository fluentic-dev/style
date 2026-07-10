/* eslint-disable */
import { createExtractedSlot } from "@fluentic/style/entry/prod/extract";
import { combineStyle } from "@fluentic/style/entry/prod/runtime";
const styles = {
  card: createExtractedSlot("14csclw", [["mwx9540", "background-color-ytqgsj0"], ["rykr7b0", "border-bxcbv2j"], ["1aeebut", "radius-bjuhzn7"], ["18q1j80", "color-g4qkdr0"], ["1ffb9qm", "padding-hp87sf0"], ["19uc4fd", "transform-aria-pressed-true-leycbx0"], ["1nca60l", "display-flex-ckaky50"], ["1a6hjt3", "flex-column-jlx9qs0"], ["1cyo51p", "row-gap-guspd80"], ["1gc9zxu", "768px-lte-width-lt-1024px-padding-sfjcz30"], ["1qi6vb6", "box-shadow-bt5w2ul"]]),
  row: createExtractedSlot("1pp84le", [["1nca60l", "display-flex-byi3zv4"], ["1a6hjt3", "flex-row-bheeznl"], ["w7kw820", "items-center-nmpi0z0"], ["120ot0w", "justify-center-wgsx390"], ["1vlsvq1", "column-gap-eob3t30"], ["16jklu7", "1024px-lte-width-lt-1280px-column-gap-hb8bym0"]]),
  badge: createExtractedSlot("1rnp0lk", [["18q1j80", "color-cgy4ny0"], ["1ut2mip", "font-size-kf4r8s0"], ["1pkhne0", "font-800-lpxmx30"], ["1ffb9qm", "padding-b8wxl4j"], ["1aeebut", "radius-fb2s2z0"], ["lokpo10", "background-color-data-tone-brand-bayd0ir"]]),
  action: createExtractedSlot("6mn65x0", [["mwx9540", "background-color-ba3wgvp"], ["rykr7b0", "border-rnjwww0"], ["18q1j80", "color-b4fq16k"], ["1ffb9qm", "padding-ad02to0"], ["1aeebut", "radius-g7ikq00"], ["1e7v1fv", "background-color-hover-es3pkw0"], ["hbne4a0", "transform-aria-pressed-true-b4eyikc"]])
};
export default function App() {
  const css = combineStyle(styles);
  return <article css={css.card}>
      <div css={css.row}>
        <strong>Design system</strong>
        <span css={css.badge} data-tone='brand'>merged</span>
      </div>
      <button css={css.action} aria-pressed='false'>Action</button>
    </article>;
}