import { useCss } from '@fluentic/style';
import { createPrecompiledStyle } from '@fluentic/style/precompile';
const styles = {
  row: createPrecompiledStyle([['1nca60l', 'fruelm0'], ['1phh07j', 'b1apwtx'], ['1a6hjt3', 's4ciid0']]),
  column: createPrecompiledStyle([['1nca60l', 'fruelm0'], ['1phh07j', 'uazf000'], ['1a6hjt3', 'oez5rp0']]),
  card: createPrecompiledStyle([['1ffb9qm', 'd9sf8l0'], ['1a6hjt3', 's4ciid0'], ['b1yxcs0', 'blgc668']]),
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
