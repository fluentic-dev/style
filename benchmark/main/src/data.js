const readPageSize = () => {
  if (typeof window === 'undefined') return 500;
  const q = new URLSearchParams(window.location.search).get('rows');
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? n : 500;
};

const readPositiveNumber = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const q = new URLSearchParams(window.location.search).get(name);
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const PAGE_SIZE = readPageSize();
export const WARMUP_RUNS = readPositiveNumber('warmups', 2);
export const MEASURED_RUNS = readPositiveNumber('measured', 10);
export const UPDATE_STEPS = readPositiveNumber('updateSteps', 20);
export const REMOUNT_STEPS = readPositiveNumber('remountSteps', 5);
export const rows = Array.from(
  { length: PAGE_SIZE },
  (_, i) => ({
    id: i + 1,
    name: `Customer ${i + 1}`,
    plan: i % 3 === 0 ? 'Enterprise' : i % 2 === 0 ? 'Pro' : 'Basic',
    usage: (i * 13) % 100,
    status: i % 7 === 0 ? 'blocked' : i % 5 === 0 ? 'trial' : 'active',
  }),
);
export const menu = ['Overview', 'Customers', 'Billing', 'Rules', 'Reports', 'Settings'];
export function getRowVars(row, tick) {
  return {
    '--bench-row-hue': String((row.id * 17 + tick * 23) % 360),
    '--bench-row-opacity': String(0.72 + ((row.id + tick) % 8) / 30),
    '--bench-row-offset': ((row.id + tick) % 7) - 3 + 'px',
  };
}
export const palette = {
  bg: '#0f172a',
  panel: '#111827',
  panel2: '#1f2937',
  text: '#e5e7eb',
  muted: '#94a3b8',
  border: '#334155',
  accent: '#22d3ee',
};
export const base = {
  page: {
    minHeight: '100vh',
    background: palette.bg,
    color: palette.text,
    padding: 18,
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    background: '#0b1220',
  },
  shell: { display: 'grid', gridTemplateColumns: '250px 1fr', gap: 12 },
  card: {
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    background: palette.panel,
    padding: 12,
  },
  title: { margin: 0, fontSize: 20 },
  muted: { color: palette.muted, fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thtd: { borderBottom: `1px solid ${palette.border}`, textAlign: 'left', padding: '8px 6px' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    fontSize: 11,
  },
  menuBtn: {
    width: '100%',
    marginBottom: 6,
    textAlign: 'left',
    border: `1px solid ${palette.border}`,
    background: palette.panel2,
    color: palette.text,
    borderRadius: 8,
    padding: '8px 10px',
  },
  select: {
    background: '#0b1220',
    color: palette.text,
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    padding: '6px 8px',
  },
  detailsHero: {
    border: `1px solid ${palette.border}`,
    background: '#0b1220',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
};
