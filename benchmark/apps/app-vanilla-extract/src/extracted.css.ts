import { style } from '@vanilla-extract/css';

const palette = {
  bg: '#0f172a',
  panel: '#111827',
  panel2: '#1f2937',
  text: '#e5e7eb',
  muted: '#94a3b8',
  border: '#334155',
  accent: '#22d3ee',
};

export const vPage = style({
  minHeight: '100vh',
  background: palette.bg,
  color: palette.text,
  padding: 18,
  fontFamily: 'system-ui, sans-serif',
});
export const vHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  background: '#0b1220',
});
export const vShell = style({ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 12 });
export const vCard = style({
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  background: palette.panel,
  padding: 12,
});
export const vTitle = style({
  margin: 0,
  fontSize: 20,
  '@media': { '(max-width: 900px)': { fontSize: 18 } },
});
export const vMuted = style({
  color: palette.muted,
  fontSize: 12,
  selectors: { '&:hover': { color: '#cbd5e1' } },
});
export const vTable = style({ width: '100%', borderCollapse: 'collapse', fontSize: 13 });
export const vThTd = style({
  borderBottom: `1px solid ${palette.border}`,
  textAlign: 'left',
  padding: '8px 6px',
});
export const vBadge = style({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  border: `1px solid ${palette.border}`,
  fontSize: 11,
});
export const vBadgeThemed = style({ color: 'var(--bench-badge-accent, var(--bench-token-accent, #22d3ee))' });
export const vMenuBtn = style({
  width: '100%',
  marginBottom: 6,
  textAlign: 'left',
  border: `1px solid ${palette.border}`,
  background: palette.panel2,
  color: palette.text,
  borderRadius: 8,
  padding: '8px 10px',
});
export const vSelect = style({
  background: '#0b1220',
  color: palette.text,
  border: `1px solid ${palette.border}`,
  borderRadius: 8,
  padding: '6px 8px',
});
export const vDetailsHero = style({
  border: `1px solid ${palette.border}`,
  background: '#0b1220',
  borderRadius: 10,
  padding: 16,
  marginBottom: 12,
});
export const vRowThemed = style({
  background: 'var(--bench-row-surface, var(--bench-token-surface, #111827))',
  borderLeft: '3px solid transparent',
  borderLeftColor: 'var(--bench-row-ring, var(--bench-token-ring, rgba(34,211,238,0.20)))',
});
export const vRowActive = style({ background: 'rgba(34,211,238,0.08)' });
export const vMenuBtnHover = style({ selectors: { '&:hover': { borderColor: palette.accent } } });
export const vThemeActive = style({
  vars: {
    '--bench-token-accent': '#0f766e',
    '--bench-token-surface': 'rgba(240,253,250,0.92)',
    '--bench-token-ring': 'rgba(15,118,110,0.24)',
  },
});
export const vThemeTrial = style({
  vars: {
    '--bench-token-accent': '#b45309',
    '--bench-token-surface': 'rgba(255,251,235,0.92)',
    '--bench-token-ring': 'rgba(180,83,9,0.22)',
  },
});
export const vThemeBlocked = style({
  vars: {
    '--bench-token-accent': '#dc2626',
    '--bench-token-surface': 'rgba(254,242,242,0.92)',
    '--bench-token-ring': 'rgba(220,38,38,0.22)',
  },
});
