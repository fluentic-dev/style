import { useCss } from '@fluentic/style';
import { style } from './style';

const styles = {
  page: style({
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    boxSizing: 'border-box',
    color: '#0f172a',
    display: 'flex',
    column: true,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 32,
  }),
  card: style({
    backgroundColor: '#ffffff',
    border: '1px solid #dbe3ef',
    borderRadius: 8,
    boxShadow: '0 18px 44px rgba(15, 23, 42, 0.10)',
    boxSizing: 'border-box',
    display: 'flex',
    column: true,
    gap: 16,
    padding: 28,
  }).media('(max-width: 640px)', {
    padding: 20,
  }),
  row: style({
    display: 'flex',
    row: true,
    gap: 8,
    alignItems: 'center',
  }),
  title: style({
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.1,
    margin: 0,
  }),
  badge: style({
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 8px',
  }),
  button: style({
    backgroundColor: '#2563eb',
    border: 0,
    borderRadius: 8,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
    padding: '10px 14px',
    transition: 'transform 160ms ease, background-color 160ms ease',
  }).onHover({
    backgroundColor: '#1d4ed8',
    transform: 'translateY(-1px)',
  }),
};

export function App() {
  const css = useCss(styles);

  return (
    <main css={css.page}>
      <section css={css.card}>
        <div css={css.row}>
          <h1 css={css.title}>Custom createStyleFn</h1>
          <span css={css.badge}>transform</span>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          <code>row: true</code> and <code>column: true</code> are custom shorthand props transformed to{' '}
          <code>flexDirection</code> at build &amp; runtime.
        </p>
        <button css={css.button}>Hover me</button>
      </section>
    </main>
  );
}
