/* eslint-disable */
import { createExtractedStyle } from "@fluentic/style/builder/extract";
import { combineStyle } from '@fluentic/style';
const styles = {
    row: createExtractedStyle([["1nca60l", "display-flex-fruelm0"], ["1phh07j", "g-11apwtx"], ["1a6hjt3", "flex-row-s4ciid0"]]),
    column: createExtractedStyle([["1nca60l", "display-flex-fruelm0"], ["1phh07j", "g-uazf000"], ["1a6hjt3", "flex-column-oez5rp0"]]),
    card: createExtractedStyle([["1ffb9qm", "padding-d9sf8l0"], ["1a6hjt3", "flex-row-s4ciid0"], ["b1yxcs0", "flex-hover-column-1lgc668"]])
};
export default () => {
    const css = combineStyle(styles);
    return <div css={css.row}>
      <div css={css.column}>
        <div css={css.card}>card</div>
      </div>
    </div>;
};
