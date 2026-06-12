import * as stylex from '@stylexjs/stylex';

const palette = {
  bg: '#0f172a',
  panel: '#111827',
  panel2: '#1f2937',
  text: '#e5e7eb',
  muted: '#94a3b8',
  border: '#334155',
  accent: '#22d3ee',
};

export const stylexStyles = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: palette.bg,
    color: palette.text,
    padding: 18,
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: palette.border,
    borderRadius: 10,
    padding: '10px 12px',
    backgroundColor: '#0b1220',
  },
  shell: { display: 'grid', gridTemplateColumns: '250px 1fr', gap: 12 },
  card: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: palette.panel,
    padding: 12,
  },
  title: {
    margin: 0,
    fontSize: {
      default: 20,
      '@media (max-width: 900px)': 18,
    },
  },
  muted: {
    color: {
      default: palette.muted,
      ':hover': '#cbd5e1',
    },
    fontSize: 12,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thtd: {
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: palette.border,
    textAlign: 'left',
    padding: '8px 6px',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: palette.border,
    fontSize: 11,
  },
  menuBtn: {
    width: '100%',
    marginBottom: 6,
    textAlign: 'left',
    borderWidth: 1,
    borderStyle: 'solid',
    backgroundColor: palette.panel2,
    color: palette.text,
    borderRadius: 8,
    padding: '8px 10px',
    borderColor: {
      default: palette.border,
      ':hover': palette.accent,
    },
  },
  select: {
    backgroundColor: '#0b1220',
    color: palette.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: palette.border,
    borderRadius: 8,
    padding: '6px 8px',
  },
  detailsHero: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: palette.border,
    backgroundColor: '#0b1220',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  rowActive: { backgroundColor: 'rgba(34,211,238,0.08)' },
});

export function sx(...parts) {
  return stylex.props(...parts);
}
