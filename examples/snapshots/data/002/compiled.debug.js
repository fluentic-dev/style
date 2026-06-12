import { useCss } from '@fluentic/style';
import { createPrecompiledStyle } from '@fluentic/style/precompile';
const styles = {
  row: createPrecompiledStyle([['1nca60l', 'display-flex-fruelm0'], ['1phh07j', 'g--8-11apwtx'], [
    '1a6hjt3',
    'flex-row-s4ciid0',
  ]]),
  column: createPrecompiledStyle([['1nca60l', 'display-flex-fruelm0'], ['1phh07j', 'g--12-uazf000'], [
    '1a6hjt3',
    'flex-column-oez5rp0',
  ]]),
  card: createPrecompiledStyle([['1ffb9qm', 'padding--16-d9sf8l0'], ['1a6hjt3', 'flex-row-s4ciid0'], [
    'b1yxcs0',
    'flex:hover-column-1lgc668',
  ]]),
};
export default () => {
  const css = useCss(styles);
  return (
    <div css={css.row}>
      <div css={css.column}>
        <div css={css.card}>card</div>
      </div>
    </div>
  );
};
