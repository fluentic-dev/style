/* eslint-disable */
import { createExtractedStyle } from "@fluentic/style/entry/prod/extract";
import { combineStyle } from "@fluentic/style/entry/prod/runtime";
const styles = {
  row: createExtractedStyle([["1nca60l", "display-flex-b5dr4mw"], ["1phh07j", "gap-b7wxo29"], ["1a6hjt3", "flex-row-hltteo0"]]),
  column: createExtractedStyle([["1nca60l", "display-flex-up83x60"], ["1phh07j", "gap-ykw8h60"], ["1a6hjt3", "flex-column-bm5mr6q"]]),
  card: createExtractedStyle([["1ffb9qm", "padding-bek2uba"], ["1a6hjt3", "flex-row-mncwzh0"], ["b1yxcs0", "flex-hover-column-b2168mk"]])
};
export default () => {
  const css = combineStyle(styles);
  return <div css={css.row}>
      <div css={css.column}>
        <div css={css.card}>card</div>
      </div>
    </div>;
};