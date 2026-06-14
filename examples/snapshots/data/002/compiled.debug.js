/* eslint-disable */
import { createExtractedStyle } from "@fluentic/style/builder/extract";
import { combineStyle } from '@fluentic/style';
const _fluenticStyle = createExtractedStyle([["1nca60l", "display-flex-fruelm0"], ["1phh07j", "gap-11apwtx"], ["1a6hjt3", "flex-row-s4ciid0"]]);
const _fluenticStyle2 = createExtractedStyle([["1nca60l", "display-flex-fruelm0"], ["1phh07j", "gap-uazf000"], ["1a6hjt3", "flex-column-oez5rp0"]]);
const _fluenticStyle3 = createExtractedStyle([["1ffb9qm", "padding-d9sf8l0"], ["1a6hjt3", "flex-row-s4ciid0"], ["b1yxcs0", "flex-hover-column-1lgc668"]]);
const styles = {
    row: _fluenticStyle,
    column: _fluenticStyle2,
    card: _fluenticStyle3
};
export default () => {
    const css = combineStyle(styles);
    return <div css={css.row}>
      <div css={css.column}>
        <div css={css.card}>card</div>
      </div>
    </div>;
};
