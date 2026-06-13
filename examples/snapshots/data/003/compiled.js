/* eslint-disable */
import { createExtractedStyle, createExtractedSlot, createExtractedScope } from "@fluentic/style/builder/extract";
import { bindScope, combineStyle } from '@fluentic/style';
const parentStyles = {
    shell: createExtractedStyle([["1nca60l", "jgp0up0"], ["1phh07j", "uazf000"], ["1ffb9qm", "d9sf8l0"]])
};
const childStyles = {
    root: createExtractedSlot("16sd2hn", [["18q1j80", "brq72zr"], ["1ffb9qm", "cjx4pq0"]]),
    label: createExtractedSlot("nhni9w0", [["1pkhne0", "bs1kyyx"]])
};
const childTheme = createExtractedScope([[4, "16sd2hn", "18q1j80", "ex2wz20"], [4, "nhni9w0", "18q1j80", "bog7gqi"]]);
const combineChildStyle = combineStyle.for(childStyles);
function Child(props) {
    const css = combineChildStyle(props.styles, ...bindScope(childStyles.root, props.theme));
    return <article css={css.root}>
      <span css={css.label}>Explicit scope</span>
    </article>;
}
export default function Parent() {
    const parentCss = combineStyle(parentStyles);
    const childCss = combineChildStyle(...bindScope(childStyles.root, childTheme));
    return <section css={parentCss.shell}>
      <Child styles={childCss}/>
    </section>;
}
