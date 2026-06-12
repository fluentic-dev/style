import { css } from '../styled-system/css';

const palette = {
  bg: '#0f172a',
  panel: '#111827',
  panel2: '#1f2937',
  text: '#e5e7eb',
  muted: '#94a3b8',
  border: '#334155',
  accent: '#22d3ee',
};

const base = {
  page: {
    minHeight: '100vh',
    background: palette.bg,
    color: palette.text,
    padding: '18px',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    border: `1px solid ${palette.border}`,
    borderRadius: '10px',
    padding: '10px 12px',
    background: '#0b1220',
  },
  shell: { display: 'grid', gridTemplateColumns: '250px 1fr', gap: '12px' },
  card: {
    border: `1px solid ${palette.border}`,
    borderRadius: '10px',
    background: palette.panel,
    padding: '12px',
  },
  title: { margin: 0, fontSize: '20px' },
  muted: { color: palette.muted, fontSize: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thtd: { borderBottom: `1px solid ${palette.border}`, textAlign: 'left', padding: '8px 6px' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '999px',
    border: `1px solid ${palette.border}`,
    fontSize: '11px',
  },
  menuBtn: {
    width: '100%',
    marginBottom: '6px',
    textAlign: 'left',
    border: `1px solid ${palette.border}`,
    background: palette.panel2,
    color: palette.text,
    borderRadius: '8px',
    padding: '8px 10px',
  },
  select: {
    background: '#0b1220',
    color: palette.text,
    border: `1px solid ${palette.border}`,
    borderRadius: '8px',
    padding: '6px 8px',
  },
  detailsHero: {
    border: `1px solid ${palette.border}`,
    background: '#0b1220',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
  },
};

export const pandaStyles = {
  page: css(base.page),
  header: css(base.header),
  shell: css(base.shell),
  card: css(base.card),
  title: css({ ...base.title, '@media (max-width: 900px)': { fontSize: '18px' } }),
  muted: css({ ...base.muted, '&:hover': { color: '#cbd5e1' } }),
  table: css(base.table),
  thtd: css(base.thtd),
  badge: css(base.badge),
  menuBtn: css({ ...base.menuBtn, '&:hover': { borderColor: palette.accent } }),
  select: css(base.select),
  detailsHero: css(base.detailsHero),
  rowActive: css({ background: 'rgba(34,211,238,0.08)' }),
};
