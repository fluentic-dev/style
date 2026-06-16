/* eslint-disable */
import { bindScope, combineStyle } from '@fluentic/style';
import { createExtractedScope, createExtractedSlot, createExtractedStyle } from '@fluentic/style/builder/extract';
const _fluenticStyle = createExtractedStyle([['1nca60l', 'jgp0up0'], ['1phh07j', 'uazf000'], ['1ffb9qm', 'd9sf8l0']]);
const _fluenticStyle2 = createExtractedSlot('16sd2hn', [['18q1j80', 'brq72zr'], ['1ffb9qm', 'cjx4pq0']]);
const _fluenticStyle3 = createExtractedSlot('nhni9w0', [['1pkhne0', 'bs1kyyx']]);
const _fluenticStyle4 = createExtractedScope([[4, '16sd2hn', '18q1j80', 'ex2wz20'], [
  4,
  'nhni9w0',
  '18q1j80',
  'bog7gqi',
]]);
const parentStyles = {
  shell: _fluenticStyle,
};
const childStyles = {
  root: _fluenticStyle2,
  label: _fluenticStyle3,
};
const childTheme = _fluenticStyle4;
const combineChildStyle = combineStyle.for(childStyles);
function Child(props) {
  const css = combineChildStyle(props.styles, bindScope(childStyles.root, props.theme));
  return (
    <article css={css.root}>
      <span css={css.label}>Explicit scope</span>
    </article>
  );
}
export default function Parent() {
  const parentCss = combineStyle(parentStyles);
  const childCss = combineChildStyle(bindScope(childStyles.root, childTheme));
  return (
    <section css={parentCss.shell}>
      <Child styles={childCss} />
    </section>
  );
}
