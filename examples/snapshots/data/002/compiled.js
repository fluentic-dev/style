/* eslint-disable */
import { combineStyle } from '@fluentic/style';
import { createExtractedStyle } from '@fluentic/style/builder/extract';
const _fluenticStyle = createExtractedStyle([['1nca60l', 'fruelm0'], ['1phh07j', 'b1apwtx'], ['1a6hjt3', 's4ciid0']]);
const _fluenticStyle2 = createExtractedStyle([['1nca60l', 'fruelm0'], ['1phh07j', 'uazf000'], ['1a6hjt3', 'oez5rp0']]);
const _fluenticStyle3 = createExtractedStyle([['1ffb9qm', 'd9sf8l0'], ['1a6hjt3', 's4ciid0'], ['b1yxcs0', 'blgc668']]);
const styles = {
  row: _fluenticStyle,
  column: _fluenticStyle2,
  card: _fluenticStyle3,
};
export default () => {
  const css = combineStyle(styles);
  return (
    <div css={css.row}>
      <div css={css.column}>
        <div css={css.card}>card</div>
      </div>
    </div>
  );
};
