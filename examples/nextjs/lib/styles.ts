import { createToken, style } from '@fluentic/style';

export const accent = createToken('#0f766e');

export const page = {
  shell: style.slot({
    minHeight: '100vh',
    padding: '32px clamp(18px, 5vw, 72px) 56px',
    position: 'relative',
  }),
  backdrop: style.slot({
    background:
      'linear-gradient(180deg, rgba(247,245,239,0.92) 0%, rgba(247,245,239,0.88) 100%), repeating-linear-gradient(90deg, rgba(15,118,110,0.04) 0 1px, transparent 1px 32px), repeating-linear-gradient(0deg, rgba(15,118,110,0.035) 0 1px, transparent 1px 32px)',
    inset: 0,
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: -1,
  }),
  content: style.slot({
    display: 'grid',
    gap: 28,
    margin: '0 auto',
    maxWidth: 1180,
    position: 'relative',
    width: '100%',
  }),
  topbar: style.slot({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  }),
  brand: style.slot({
    display: 'grid',
    gap: 4,
  }),
  brandLabel: style.slot({
    color: '#0f766e',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  }),
  brandValue: style.slot({
    color: '#111827',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0,
  }),
  statusRow: style.slot({
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  }),
  statusChip: style.slot({
    backgroundColor: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(15,118,110,0.18)',
    borderRadius: 999,
    color: '#155e56',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.06,
    padding: '8px 12px',
    textTransform: 'uppercase',
  }),
  nav: style.slot({
    backgroundColor: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(20,24,31,0.1)',
    borderRadius: 14,
    boxShadow: '0 12px 30px rgba(34, 42, 37, 0.06)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  }),
  link: style.slot({
    border: '1px solid transparent',
    borderRadius: 10,
    color: '#313633',
    fontSize: 14,
    fontWeight: 600,
    padding: '10px 14px',
    textDecoration: 'none',
  }).hover({
    backgroundColor: 'rgba(15,118,110,0.08)',
    borderColor: 'rgba(15,118,110,0.16)',
    color: accent,
  }),
  hero: style.slot({
    display: 'grid',
    gap: 12,
    paddingTop: 8,
  }),
  eyebrow: style.slot({
    color: '#0f766e',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  }),
  heading: style.slot({
    fontSize: 'clamp(2.4rem, 6vw, 5.4rem)',
    letterSpacing: 0,
    lineHeight: 0.94,
    margin: 0,
    maxWidth: 900,
  }),
  intro: style.slot({
    color: '#4a514d',
    fontSize: 'clamp(1rem, 1.4vw, 1.125rem)',
    lineHeight: 1.68,
    margin: 0,
    maxWidth: 760,
  }),
  metaRow: style.slot({
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 6,
  }),
  metaPill: style.slot({
    backgroundColor: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(20,24,31,0.1)',
    borderRadius: 999,
    color: '#313633',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 12px',
  }),
  grid: style.slot({
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  }),
  card: style.slot({
    backgroundColor: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(20,24,31,0.1)',
    borderRadius: 14,
    boxShadow: '0 18px 40px rgba(34, 42, 37, 0.06)',
    display: 'grid',
    gap: 12,
    minHeight: 190,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
  }),
  cardAccent: style.slot({
    backgroundColor: accent,
    height: 3,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  }),
  cardTitle: style.slot({
    color: accent,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0,
    margin: 0,
    textTransform: 'uppercase',
  }),
  cardText: style.slot({
    color: '#2b302d',
    fontSize: 16,
    lineHeight: 1.55,
    margin: 0,
    maxWidth: '50ch',
  }),
};

export const emphasis = style.scope([
  page.card({
    borderColor: accent,
  }),
  page.cardAccent({
    backgroundColor: '#145d54',
  }),
  page.cardTitle({
    color: '#7c2d12',
  }),
]);
