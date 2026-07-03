/* eslint-disable */
import { createExtractedStyle, createExtractedSlot, createExtractedScope } from "@fluentic/style/entry/prod/extract";
import { bindScope, type CombinedStyleFor, combineStyle, type StyleTheme } from '@fluentic/style';
const parentStyles = {
  shell: createExtractedStyle([["1nca60l", "display-grid-by2ykic"], ["1phh07j", "gap-bx12o76"], ["1ffb9qm", "padding-a4jdta0"]])
};
const childStyles = {
  root: createExtractedSlot("wu3w6r0", [["18q1j80", "color-black-ghfc8x0"], ["1ffb9qm", "padding-bsj9kul"]]),
  label: createExtractedSlot("djebz00", [["1pkhne0", "font-700-bm30w4b"]])
};
const childTheme = createExtractedScope([[4, "wu3w6r0", "18q1j80", "color-purple-b9l8roz"], [4, "djebz00", "18q1j80", "color-teal-bjishx8"]]);
const combineChildStyle = combineStyle.for(childStyles);
type ChildStyle = CombinedStyleFor<typeof combineChildStyle>;
function Child(props: {
  styles?: ChildStyle;
  theme?: StyleTheme;
}) {
  const css = combineChildStyle(props.styles, bindScope(childStyles.root, props.theme));
  return <article css={css.root}>
      <span css={css.label}>Explicit scope</span>
    </article>;
}
export default function Parent() {
  const parentCss = combineStyle(parentStyles);
  const childCss = combineChildStyle(bindScope(childStyles.root, childTheme));
  return <section css={parentCss.shell}>
      <Child styles={childCss} />
    </section>;
}