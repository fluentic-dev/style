/* eslint-disable */
import { createExtractedSlot } from "@fluentic/style/entry/prod/extract";
import { combineStyle } from "@fluentic/style/entry/prod/runtime";
const styles = {
  card: createExtractedSlot("14csclw", [["mwx9540", "background-color-ytqgsj0"], ["rykr7b0", "border-bxcbv2j"], ["1aeebut", "radius-bjuhzn7"], ["18q1j80", "color-g4qkdr0"], ["1ffb9qm", "padding-hp87sf0"], ["19uc4fd", "transform-aria-pressed-true-leycbx0"], ["1nca60l", "display-flex-fruelm0"], ["1a6hjt3", "flex-column-oez5rp0"], ["1cyo51p", "row-gap-lljp0o0"], ["1gc9zxu", "768px-lte-width-lt-1024px-padding-bu59zhw"], ["1qi6vb6", "box-shadow-bwkz73g"]]),
  row: createExtractedSlot("1pp84le", [["1nca60l", "display-flex-fruelm0"], ["1a6hjt3", "flex-row-s4ciid0"], ["w7kw820", "items-center-i8h0vn0"], ["120ot0w", "justify-center-b3ihqkd"], ["1vlsvq1", "column-gap-bi3gqc0"], ["16jklu7", "1024px-lte-width-lt-1280px-column-gap-bxdjbts"]]),
  badge: createExtractedSlot("1rnp0lk", [["18q1j80", "color-cgy4ny0"], ["1ut2mip", "font-size-kf4r8s0"], ["1pkhne0", "font-800-lpxmx30"], ["1ffb9qm", "padding-b8wxl4j"], ["1aeebut", "radius-bydd33m"], ["lokpo10", "background-color-data-tone-brand-b8m588o"]]),
  action: createExtractedSlot("6mn65x0", [["mwx9540", "background-color-ba3wgvp"], ["rykr7b0", "border-rnjwww0"], ["18q1j80", "color-b4fq16k"], ["1ffb9qm", "padding-ad02to0"], ["1aeebut", "radius-bydd33m"], ["1e7v1fv", "background-color-hover-xco3ay0"], ["hbne4a0", "transform-aria-pressed-true-bw9jzo5"]])
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