/* eslint-disable */
import { createExtractedStyle } from "@fluentic/style/builder/extract";
import { combineStyle } from '@fluentic/style';
const styles = {
    row: createExtractedStyle([["1nca60l", "fruelm0"], ["1phh07j", "b1apwtx"], ["1a6hjt3", "s4ciid0"]]),
    column: createExtractedStyle([["1nca60l", "fruelm0"], ["1phh07j", "uazf000"], ["1a6hjt3", "oez5rp0"]]),
    card: createExtractedStyle([["1ffb9qm", "d9sf8l0"], ["1a6hjt3", "s4ciid0"], ["b1yxcs0", "blgc668"]])
};
export default () => {
    const css = combineStyle(styles);
    return <div css={css.row}>
      <div css={css.column}>
        <div css={css.card}>card</div>
      </div>
    </div>;
};
