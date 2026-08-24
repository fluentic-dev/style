import { cx } from './classNameStyle.mjs';

const Breakpoints = {
  heroGrid: 'minmax(0,_0.95fr)_minmax(320px,_0.9fr)',
  cardGrid: 'repeat(3,_minmax(0,_1fr))',
  cardGridMobile: '1fr',
};

const s = {
  page: cx('min-h-screen', 'bg-paper', 'overflow-x-hidden', 'text-ink'),

  shell: cx('w-shell', 'mx-auto')
    .maxMd('w-shell-tablet')
    .maxSm('w-shell-mobile'),

  hero: cx(
    'grid',
    `[grid-template-columns:${Breakpoints.heroGrid}]`,
    'items-center',
    'gap-grid-gap',
    'py-hero-y',
  )
    .maxMd('[grid-template-columns:1fr]', 'py-hero-mobile-y')
    .maxSm('gap-card'),

  heroCopy: cx('grid', 'gap-card'),

  eyebrow: cx(
    'inline-flex',
    'items-center',
    'w-fit',
    'rounded-pill',
    'bg-accent-soft',
    'px-card',
    'py-field',
    'text-chip',
    'font-strong',
    'text-accent',
    '[text-transform:uppercase]',
  ),

  h1: cx(
    'm-0',
    'text-title',
    'leading-title',
    'font-strong',
    'text-plum',
  ).maxSm('text-title-mobile', 'leading-title-mobile'),

  lead: cx(
    'm-0',
    'max-w-[54ch]',
    'text-copy',
    'leading-copy',
    'text-ink-soft',
  ).maxSm('max-w-full'),

  actions: cx('flex', 'flex-wrap', 'items-center', 'gap-card')
    .maxSm('w-full', 'grid', '[grid-template-columns:1fr]'),

  cta: cx(
    'inline-flex',
    'items-center',
    'justify-center',
    'h-touch',
    'rounded-pill',
    'border-[1px_solid_currentColor]',
    'border-accent',
    'bg-accent',
    'px-card',
    'text-white',
    'font-strong',
  ).hover('bg-plum'),

  secondaryCta: cx(
    'inline-flex',
    'items-center',
    'justify-center',
    'h-touch',
    'rounded-pill',
    'border-[1px_solid_currentColor]',
    'border-line',
    'bg-white-soft',
    'px-card',
    'text-plum',
    'font-strong',
  ),

  visual: cx(
    'grid',
    'gap-stack',
    'rounded-card',
    'bg-panel',
    'p-card-lg',
    'shadow-panel-lift',
    'border-[1px_solid_currentColor]',
    'border-line',
    'min-h-visual-min',
  ),

  visualHeader: cx('flex', 'items-center', 'justify-between', 'gap-card'),

  visualTitle: cx('m-0', 'text-h3', 'font-strong', 'text-plum'),

  statusPill: cx(
    'inline-flex',
    'items-center',
    'gap-field',
    'rounded-pill',
    'bg-accent-soft',
    'px-card',
    'py-field',
    'text-small',
    'font-strong',
    'text-accent',
  ),

  statusDot: cx('w-dot', 'h-dot', 'rounded-pill', 'bg-accent'),

  list: cx('grid', 'gap-field'),

  row: cx(
    'grid',
    '[grid-template-columns:auto_1fr_auto]',
    'items-center',
    'gap-card',
    'rounded-card',
    'bg-white',
    'p-card',
    'border-[1px_solid_currentColor]',
    'border-line',
  ),

  rowIcon: cx(
    'grid',
    '[place-items:center]',
    'w-touch',
    'h-touch',
    'rounded-pill',
    'bg-accent-soft',
    'text-accent',
    'font-strong',
  ),

  rowBody: cx('grid', 'gap-field'),

  rowMeta: cx('m-0', 'text-small', 'leading-copy', 'text-muted'),

  rowState: cx('text-small', 'font-strong', 'text-accent'),

  note: cx(
    'm-0',
    'rounded-card',
    'bg-accent-soft',
    'p-card',
    'text-small',
    'leading-copy',
    'text-ink-soft',
  ),

  section: cx(
    'py-section-y',
    'border-[1px_solid_currentColor]',
    'border-line',
    '[border-left:0]',
    '[border-right:0]',
    '[border-bottom:0]',
  ),

  grid: cx(
    'grid',
    `[grid-template-columns:${Breakpoints.cardGrid}]`,
    'gap-card',
  ).maxSm(`[grid-template-columns:${Breakpoints.cardGridMobile}]`),

  card: cx(
    'grid',
    'gap-field',
    'rounded-card',
    'bg-white',
    'p-card',
    'shadow-panel',
    'border-[1px_solid_currentColor]',
    'border-line',
  ).hover('bg-accent-soft'),

  cardTitle: cx('m-0', 'text-copy', 'font-strong', 'text-plum'),
  cardText: cx('m-0', 'text-copy', 'leading-copy', 'text-muted'),
};

export default s;
