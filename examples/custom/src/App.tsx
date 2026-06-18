import { style, sx, ui } from './style';

const styles = {
  page: style.merge(
    style({
      backgroundColor: '#edf4f1',
      boxSizing: 'border-box',
      color: '#12201b',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      minHeight: '100vh',
      padding: 32,
    }),
    sx({
      column: true,
      center: true,
      gapY: 18,
    }).sm({
      padding: 20,
    }),
  ),

  card: style.merge(
    style.slot({
      backgroundColor: '#ffffff',
      border: '1px solid #c9d8d3',
      borderRadius: 8,
      boxSizing: 'border-box',
      maxWidth: 720,
      padding: 26,
      width: '100%',
    }),
    sx({ column: true, gapY: 22 }).sm({ padding: 20 }),
    ui({ elevated: true }),
  ),

  toolbar: style.merge(
    style.slot(),
    sx({ row: true, gapX: 18 }),
    sx().sm({ column: true, gapY: 14 }),
  ),

  intro: style.merge(
    style.slot({
      flex: 1,
      minWidth: 0,
    }),
    sx({ column: true, gapY: 10 }),
  ),

  eyebrow: style.slot({
    color: '#0f766e',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0,
    margin: 0,
    textTransform: 'uppercase',
  }),

  title: style.slot({
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
    margin: 0,
  }),

  badgeList: style.merge(
    style.slot({
      alignSelf: 'start',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      minWidth: 190,
    }),
    sx({ row: true, gapX: 8 }),
    sx().sm({ gapY: 8 }),
  ),

  badge: style.merge(
    style.slot({
      backgroundColor: '#dff7ed',
      color: '#0f766e',
      fontSize: 12,
      fontWeight: 800,
      lineHeight: 1,
      padding: '7px 10px',
      whiteSpace: 'nowrap',
    }),
    ui({ pill: true }),
    ui().tone('brand', {
      backgroundColor: '#dff7ed',
    }),
    ui().tone('success', {
      backgroundColor: '#e6f4d7',
      color: '#3f6212',
    }),
    ui().tone('danger', {
      backgroundColor: '#ffe4e6',
      color: '#be123c',
    }),
  ),

  body: style.slot({
    color: '#5a6b64',
    fontSize: 16,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 560,
  }),

  grid: style.merge(
    style.slot({
      border: '1px solid #dce7e3',
      borderRadius: 8,
      overflow: 'hidden',
    }),
    sx({ column: true }),
  ),

  row: style.merge(
    style.slot({
      backgroundColor: '#fbfdfc',
      borderBottom: '1px solid #e6efeb',
      boxSizing: 'border-box',
      minHeight: 58,
      padding: '12px 14px',
    }),
    sx({ row: true, center: true, gapX: 14 }),
    sx().sm({ column: true, gapY: 6 }),
  ),

  rowLast: style.slot({
    borderBottom: 0,
  }),

  rowName: style.slot({
    color: '#12201b',
    fontSize: 14,
    fontWeight: 800,
    minWidth: 58,
  }),

  rowText: style.slot({
    color: '#63746d',
    flex: 1,
    fontSize: 14,
    lineHeight: 1.4,
    margin: 0,
  }),

  action: style.merge(
    style.slot({
      backgroundColor: '#0f766e',
      border: 0,
      color: '#ffffff',
      cursor: 'pointer',
      fontSize: 15,
      fontWeight: 800,
      padding: '10px 18px',
      transition: 'background-color 160ms ease, transform 160ms ease',
    }).pressed({
      transform: 'translateY(1px)',
    }),
    ui({ pill: true }),
    ui().hover({
      backgroundColor: '#115e59',
      transform: 'translateY(-1px)',
    }),
    ui().focusVisible({
      outline: '3px solid #99f6e4',
      outlineOffset: 2,
    }),
  ),

  actions: style.merge(
    style.slot({
      flexWrap: 'wrap',
    }),
    sx({ row: true, gapX: 10 }),
  ),

  secondaryAction: style.merge(
    style.slot({
      backgroundColor: '#eff7f4',
      border: '1px solid #cfe2dc',
      color: '#0f766e',
      cursor: 'pointer',
      fontSize: 15,
      fontWeight: 800,
      padding: '9px 16px',
      transition: 'background-color 160ms ease, transform 160ms ease',
    }).pressed({
      transform: 'translateY(1px)',
    }),
    ui({ pill: true }),
    ui().hover({
      backgroundColor: '#dff7ed',
      transform: 'translateY(-1px)',
    }),
    ui().focusVisible({
      outline: '3px solid #99f6e4',
      outlineOffset: 2,
    }),
  ),
};

export function App() {
  return (
    <main css={styles.page}>
      <section css={styles.card}>
        <div css={styles.toolbar}>
          <div css={styles.intro}>
            <p css={styles.eyebrow}>Custom builder stack</p>
            <h1 css={styles.title}>Design-system builders</h1>
          </div>
          <div css={styles.badgeList}>
            <span css={styles.badge} data-tone='brand'>style.merge</span>
            <span css={styles.badge} data-tone='success'>sx</span>
            <span css={styles.badge} data-tone='danger'>typed tone</span>
          </div>
        </div>
        <p css={styles.body}>
          Compose slots, layout shorthands, responsive rules, and semantic selector tones without handwritten selector strings.
        </p>
        <div css={styles.grid}>
          <div css={styles.row}>
            <strong css={styles.rowName}>style</strong>
            <p css={styles.rowText}>Owns slots, scope targets, and the base component surface.</p>
          </div>
          <div css={styles.row}>
            <strong css={styles.rowName}>sx</strong>
            <p css={styles.rowText}>Adds row, column, center, and fixed responsive shortcuts.</p>
          </div>
          <div css={[styles.row, styles.rowLast]}>
            <strong css={styles.rowName}>ui</strong>
            <p css={styles.rowText}>Adds enum tones plus hover, pressed, and focus-visible states.</p>
          </div>
        </div>
        <div css={styles.actions}>
          <button css={styles.action} aria-pressed='false'>Compose builders</button>
          <button css={styles.secondaryAction} aria-pressed='false'>Preview tones</button>
        </div>
      </section>
    </main>
  );
}
