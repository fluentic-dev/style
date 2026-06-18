/* eslint-disable */
import { createExtractedStyle, createExtractedSlot, createExtractedScope } from "@fluentic/style/entry/prod/extract";
import { bindScope, combineStyle } from '@fluentic/style';
const _fluenticStyle = createExtractedStyle([["1nca60l", "display-grid-by2ykic"], ["1phh07j", "gap-bx12o76"], ["1ffb9qm", "padding-a4jdta0"]]);
const _fluenticStyle2 = createExtractedSlot("wu3w6r0", [["18q1j80", "color-black-ghfc8x0"], ["1ffb9qm", "padding-bsj9kul"]]);
const _fluenticStyle3 = createExtractedSlot("djebz00", [["1pkhne0", "font-700-bm30w4b"]]);
const _fluenticStyle4 = createExtractedScope([[4, "wu3w6r0", "18q1j80", "color-purple-b9l8roz"], [4, "djebz00", "18q1j80", "color-teal-bjishx8"]]);
const parentStyles = {
    shell: _fluenticStyle
};
const childStyles = {
    root: _fluenticStyle2,
    label: _fluenticStyle3
};
const childTheme = _fluenticStyle4;
const combineChildStyle = combineStyle.for(childStyles);
function Child(props) {
    const css = combineChildStyle(props.styles, bindScope(childStyles.root, props.theme));
    return <article css={css.root}>
      <span css={css.label}>Explicit scope</span>
    </article>;
}
export default function Parent() {
    const parentCss = combineStyle(parentStyles);
    const childCss = combineChildStyle(bindScope(childStyles.root, childTheme));
    return <section css={parentCss.shell}>
      <Child styles={childCss}/>
    </section>;
}
