import { combineStyle } from '@fluentic/style';
import { style, sx, ui } from './style';

const styles = {
  card: style.merge(
    style.slot({
      backgroundColor: '#ffffff',
      border: '1px solid #d7e4df',
      borderRadius: 8,
      color: '#12201b',
      padding: 24,
    }).pressed({
      transform: 'translateY(1px)',
    }),
    sx({ column: true, gapY: 14 }),
    sx().md({ padding: 28 }),
    ui({ elevated: true }),
  ),
  row: style.merge(
    style.slot(),
    sx({ row: true, center: true, gapX: 10 }),
    sx().lg({ gapX: 14 }),
  ),
  badge: style.merge(
    style.slot({
      color: '#0f766e',
      fontSize: 12,
      fontWeight: 800,
      padding: '4px 10px',
    }),
    ui({ pill: true }),
    ui().tone('brand', {
      backgroundColor: '#dff7ed',
    }),
  ),
  action: style.merge(
    style.slot({
      backgroundColor: '#0f766e',
      border: 0,
      color: '#ffffff',
      padding: '10px 16px',
    }),
    ui({ pill: true }),
    ui().hover({
      backgroundColor: '#115e59',
    }),
    ui().pressed({
      transform: 'translateY(1px)',
    }),
  ),
};

export default function App() {
  const css = combineStyle(styles);

  return (
    <article css={css.card}>
      <div css={css.row}>
        <strong>Design system</strong>
        <span css={css.badge} data-tone='brand'>merged</span>
      </div>
      <button css={css.action} aria-pressed='false'>Action</button>
    </article>
  );
}
