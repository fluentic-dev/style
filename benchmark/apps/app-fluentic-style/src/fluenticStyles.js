import { base, palette } from '@benchmark/main';
import { getClassName, style } from '@fluentic/style';

const resolveClassName = (css) => getClassName(css).className ?? '';

export const fluenticStyles = {
  page: style(base.page),
  header: style(base.header),
  shell: style(base.shell),
  card: style(base.card),
  table: style(base.table),
  thtd: style(base.thtd),
  badge: style(base.badge),
  menuBtn: style(base.menuBtn).hover({ borderColor: palette.accent }),
  select: style(base.select),
  detailsHero: style(base.detailsHero),
  rowActive: style({ background: 'rgba(34,211,238,0.08)' }),
  panelSlot: style.slot(base.card).media('(max-width: 900px)', { padding: 10 }),
  panelSlotChainExtract: style.slot(base.card)
    .media('(max-width: 900px)', { padding: 10 })
    .media('(min-width: 700px)', { background: '#0d1727' }),
  panelTitle: style.slot(base.title).media('(max-width: 900px)', { fontSize: 18 }),
  panelDesc: style.slot(base.muted).hover({ color: '#cbd5e1' }),
};

export const fluenticClassNames = {
  page: resolveClassName(fluenticStyles.page),
  header: resolveClassName(fluenticStyles.header),
  shell: resolveClassName(fluenticStyles.shell),
  card: resolveClassName(fluenticStyles.card),
  table: resolveClassName(fluenticStyles.table),
  thtd: resolveClassName(fluenticStyles.thtd),
  badge: resolveClassName(fluenticStyles.badge),
  menuBtn: resolveClassName(fluenticStyles.menuBtn),
  select: resolveClassName(fluenticStyles.select),
  detailsHero: resolveClassName(fluenticStyles.detailsHero),
  rowActive: resolveClassName(fluenticStyles.rowActive),
  panelTitle: resolveClassName(fluenticStyles.panelTitle),
  panelDesc: resolveClassName(fluenticStyles.panelDesc),
  panelSlotSimple: resolveClassName(fluenticStyles.panelSlot),
  panelSlotChain: resolveClassName(fluenticStyles.panelSlotChainExtract),
};
