import { combineStyle } from '@fluentic/style';
import { style } from './style';

const styles = {
  row: style({
    display: 'flex',
    row: true,
    gap: 8,
  }),
  column: style({
    display: 'flex',
    column: true,
    gap: 12,
  }),
  card: style({
    padding: 16,
    row: true,
  }).hover({
    column: true,
  }),
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
