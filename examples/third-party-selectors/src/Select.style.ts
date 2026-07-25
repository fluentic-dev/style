import { createTokens, style } from '@fluentic/style';
import { createSheet } from '@fluentic/style/css';

export const selectTokens = createTokens({
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  accentText: '#1e3a8a',
  border: '#bfdbfe',
  borderStrong: '#2563eb',
  focus: '#60a5fa',
  focusShadow: '0 0 0 4px rgba(96, 165, 250, 0.22), 0 12px 28px rgba(37, 99, 235, 0.18)',
  panel: '#eff6ff',
  panelText: '#1e3a8a',
  menuAccent: '#2563eb',
  menuSoft: '#dbeafe',
  menuText: '#1e3a8a',
  shadow: '0 10px 24px rgba(37, 99, 235, 0.08)',
  text: '#111827',
});

const selectors = {
  root: style.selector('&'),
  control: style.selector('&?.fluentic-select__control'),
  controlFocused: style.selector('&?.fluentic-select__control--is-focused'),
  value: style.selector('&?.fluentic-select__value-container'),
  singleValue: style.selector('&?.fluentic-select__single-value'),
  input: style.selector('&?.fluentic-select__input-container'),
  placeholder: style.selector('&?.fluentic-select__placeholder'),
  indicators: style.selector('&?.fluentic-select__indicators'),
  indicator: style.selector('&?.fluentic-select__indicator'),
  indicatorSvg: style.selector('&?.fluentic-select__indicator svg'),
  separator: style.selector('&?.fluentic-select__indicator-separator'),
  menu: style.selector('&?.fluentic-select__menu'),
  menuList: style.selector('&?.fluentic-select__menu-list'),
  option: style.selector('&?.fluentic-select__option'),
  optionFocused: style.selector('&?.fluentic-select__option--is-focused'),
  optionSelected: style.selector('&?.fluentic-select__option--is-selected'),
};

export const selectSheet = createSheet([
  selectors.root({
    display: 'block',
    width: '100%',
  }),
  selectors.control({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    padding: '8px 10px',
    border: '2px solid',
    borderColor: selectTokens.border,
    borderRadius: 14,
    backgroundColor: selectTokens.panel,
    boxShadow: selectTokens.shadow,
    cursor: 'pointer',
    transition: 'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
  }).hover({
    borderColor: selectTokens.borderStrong,
  }),
  selectors.controlFocused({
    borderColor: selectTokens.focus,
    boxShadow: selectTokens.focusShadow,
  }),
  selectors.value({
    display: 'flex',
    alignItems: 'center',
    flex: '1 1 auto',
    minWidth: 0,
    minHeight: 34,
    padding: '5px 14px',
    borderRadius: 10,
    backgroundColor: selectTokens.accentSoft,
  }),
  selectors.singleValue({
    overflow: 'hidden',
    color: selectTokens.accentText,
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.2,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  selectors.input({
    color: selectTokens.accentText,
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.2,
  }),
  selectors.placeholder({
    color: selectTokens.accentText,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.2,
    opacity: 0.56,
  }),
  selectors.indicators({
    display: 'flex',
    alignItems: 'center',
    flex: '0 0 auto',
    height: '100%',
  }),
  selectors.indicator({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    width: 32,
    height: 32,
    padding: 0,
    borderRadius: 999,
    backgroundColor: selectTokens.accentSoft,
    color: selectTokens.accent,
  }),
  selectors.indicatorSvg({
    width: 18,
    height: 18,
    color: selectTokens.accent,
    display: 'block',
  }),
  selectors.separator({
    display: 'none',
  }),
]);

export const selectCompactSheet = createSheet([
  selectors.control({
    minHeight: 38,
    gap: 6,
    padding: '5px 7px',
    borderWidth: 1,
    borderColor: selectTokens.border,
    borderRadius: 4,
    boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)',
  }),
  selectors.controlFocused({
    boxShadow: '0 0 0 2px color-mix(in srgb, currentColor 18%, transparent)',
  }),
  selectors.value({
    minHeight: 28,
    padding: '4px 11px',
    borderRadius: 4,
    backgroundColor: selectTokens.accentSoft,
  }),
  selectors.singleValue({
    color: selectTokens.accentText,
    fontSize: 13,
    fontWeight: 660,
  }),
  selectors.input({
    fontSize: 13,
    fontWeight: 660,
  }),
  selectors.indicator({
    width: 28,
    height: 28,
    backgroundColor: selectTokens.accentSoft,
  }),
  selectors.indicatorSvg({
    width: 16,
    height: 16,
  }),
]);

export const selectMenuSheet = createSheet([
  selectors.menu({
    zIndex: 1000,
    marginTop: 6,
    padding: 8,
    border: '2px solid',
    borderColor: selectTokens.focus,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    boxShadow: '0 22px 50px rgba(15, 23, 42, 0.16)',
  }),
  selectors.menuList({
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 0,
  }),
  selectors.option({
    minHeight: 36,
    padding: '8px 10px',
    borderRadius: 6,
    color: '#334155',
    cursor: 'pointer',
    fontSize: '14px !important',
    fontWeight: 600,
    lineHeight: 1.25,
  }),
  selectors.optionFocused({
    backgroundColor: selectTokens.menuSoft,
    color: selectTokens.menuText,
    fontSize: '14px !important',
    fontWeight: 600,
  }),
  selectors.optionSelected({
    backgroundColor: selectTokens.menuSoft,
    boxShadow: 'inset 3px 0 0 currentColor',
    color: selectTokens.menuText,
    fontSize: '14px !important',
    fontWeight: 600,
  }),
]);

export const selectCompactMenuSheet = createSheet([
  selectors.menu({
    marginTop: 4,
    padding: 4,
    borderWidth: 1,
    borderRadius: 5,
  }),
  selectors.menuList({
    gap: 2,
  }),
  selectors.option({
    minHeight: 26,
    padding: '5px 7px',
    borderRadius: 3,
    fontSize: '12px !important',
    fontWeight: 520,
    lineHeight: 1.15,
  }),
  selectors.optionFocused({
    fontSize: '12px !important',
    fontWeight: 520,
  }),
  selectors.optionSelected({
    boxShadow: 'inset 2px 0 0 currentColor',
    fontSize: '12px !important',
    fontWeight: 520,
  }),
]);
