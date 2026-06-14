/* eslint-disable */
import { createExtractedStyle, createExtractedSlot, createExtractedScope } from "@fluentic/style/builder/extract";
import { bindScope, combineStyle } from '@fluentic/style';
const _fluenticStyle = createExtractedStyle([["1nca60l", "display-grid-jgp0up0"], ["1phh07j", "gap-uazf000"], ["1ffb9qm", "padding-d9sf8l0"]]);
const _fluenticStyle2 = createExtractedSlot("16sd2hn", [["18q1j80", "color-black-1rq72zr"], ["1ffb9qm", "padding-2jx4pq0"]]);
const _fluenticStyle3 = createExtractedSlot("nhni9w0", [["1pkhne0", "font-1s1kyyx"]]);
const _fluenticStyle4 = createExtractedScope([[4, "16sd2hn", "18q1j80", "color-purple-4x2wz20"], [4, "nhni9w0", "18q1j80", "color-teal-1og7gqi"]]);
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
