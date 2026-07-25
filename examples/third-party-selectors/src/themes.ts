import { style } from '@fluentic/style';
import { createSheet } from '@fluentic/style/css';
import { selectTokens } from './Select.style';

const blueSheet = createSheet([
  selectTokens.accent('#1d4ed8'),
  selectTokens.accentSoft('#dbeafe'),
  selectTokens.accentText('#1e3a8a'),
  selectTokens.border('#bfdbfe'),
  selectTokens.borderStrong('#1d4ed8'),
  selectTokens.focus('#60a5fa'),
  selectTokens.focusShadow('0 0 0 4px rgba(96, 165, 250, 0.22), 0 12px 28px rgba(29, 78, 216, 0.18)'),
  selectTokens.panel('#eff6ff'),
  selectTokens.panelText('#1e3a8a'),
  selectTokens.menuAccent('#1d4ed8'),
  selectTokens.menuSoft('#dbeafe'),
  selectTokens.menuText('#1e3a8a'),
  selectTokens.shadow('0 10px 24px rgba(29, 78, 216, 0.08)'),
]);

const roseSheet = createSheet([
  selectTokens.accent('#c0265a'),
  selectTokens.accentSoft('#fce7ef'),
  selectTokens.accentText('#8f1238'),
  selectTokens.border('#f2b6c8'),
  selectTokens.borderStrong('#c0265a'),
  selectTokens.focus('#db5f86'),
  selectTokens.focusShadow('0 0 0 4px rgba(219, 95, 134, 0.22), 0 12px 28px rgba(192, 38, 90, 0.16)'),
  selectTokens.panel('#fff1f6'),
  selectTokens.panelText('#8f1238'),
  selectTokens.menuAccent('#c0265a'),
  selectTokens.menuSoft('#fce7ef'),
  selectTokens.menuText('#8f1238'),
  selectTokens.shadow('0 10px 24px rgba(192, 38, 90, 0.08)'),
]);

const violetSheet = createSheet([
  selectTokens.accent('#8b35e8'),
  selectTokens.accentSoft('#f3e8ff'),
  selectTokens.accentText('#5b168e'),
  selectTokens.border('#ddd6fe'),
  selectTokens.borderStrong('#8b35e8'),
  selectTokens.focus('#a78bfa'),
  selectTokens.focusShadow('0 0 0 4px rgba(167, 139, 250, 0.24), 0 12px 28px rgba(139, 53, 232, 0.18)'),
  selectTokens.panel('#f5f3ff'),
  selectTokens.panelText('#5b168e'),
  selectTokens.menuAccent('#8b35e8'),
  selectTokens.menuSoft('#f3e8ff'),
  selectTokens.menuText('#5b168e'),
  selectTokens.shadow('0 10px 24px rgba(139, 53, 232, 0.08)'),
]);

export const selectThemes = [
  {
    name: 'blue',
    label: 'Blue',
    sheet: blueSheet,
    swatch: style({ backgroundColor: '#1d4ed8' }),
  },
  {
    name: 'rose',
    label: 'Rose',
    sheet: roseSheet,
    swatch: style({ backgroundColor: '#c0265a' }),
  },
  {
    name: 'violet',
    label: 'Violet',
    sheet: violetSheet,
    swatch: style({ backgroundColor: '#8b35e8' }),
  },
];
