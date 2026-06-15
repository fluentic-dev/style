import { createTheme, createTokens, style } from '@fluentic/style';

export const themeTokens = createTokens({
  color: {
    canvas: '#f5f7f6',
    surface: '#ffffff',
    surfaceRaised: '#eef4f1',
    text: '#15211d',
    muted: '#60716a',
    border: '#d8e3df',
    accent: '#0f766e',
    accentSoft: '#d8f3ee',
    accentText: '#ffffff',
    warning: '#b45309',
    warningSoft: '#fff4d7',
  },
  radius: {
    panel: 8,
    control: 7,
    pill: 999,
  },
  space: {
    panel: 18,
    row: 10,
  },
  shadow: {
    panel: '0 18px 46px rgba(26, 44, 38, 0.10)',
    floating: '0 10px 26px rgba(26, 44, 38, 0.12)',
  },
});

export const nextThemes = [
  {
    id: 'spring',
    label: 'Spring',
    theme: createTheme([
      themeTokens.color.canvas('#f5f7f6'),
      themeTokens.color.surface('#ffffff'),
      themeTokens.color.surfaceRaised('#eef4f1'),
      themeTokens.color.text('#15211d'),
      themeTokens.color.muted('#60716a'),
      themeTokens.color.border('rgba(15, 118, 110, 0.34)'),
      themeTokens.color.accent('#0f766e'),
      themeTokens.color.accentSoft('#d8f3ee'),
      themeTokens.color.accentText('#ffffff'),
      themeTokens.color.warning('#b45309'),
      themeTokens.color.warningSoft('#fff4d7'),
      themeTokens.shadow.panel('0 18px 46px rgba(26, 44, 38, 0.10)'),
      themeTokens.shadow.floating('0 10px 26px rgba(26, 44, 38, 0.12)'),
    ]),
  },
  {
    id: 'night',
    label: 'Night',
    theme: createTheme([
      themeTokens.color.canvas('#101514'),
      themeTokens.color.surface('#18211f'),
      themeTokens.color.surfaceRaised('#21302c'),
      themeTokens.color.text('#eef8f4'),
      themeTokens.color.muted('#a6bbb3'),
      themeTokens.color.border('rgba(94, 234, 212, 0.42)'),
      themeTokens.color.accent('#5eead4'),
      themeTokens.color.accentSoft('#123d38'),
      themeTokens.color.accentText('#06201c'),
      themeTokens.color.warning('#fbbf24'),
      themeTokens.color.warningSoft('#3d2f11'),
      themeTokens.shadow.panel('0 22px 52px rgba(0, 0, 0, 0.34)'),
      themeTokens.shadow.floating('0 12px 28px rgba(0, 0, 0, 0.32)'),
    ]),
  },
  {
    id: 'ember',
    label: 'Ember',
    theme: createTheme([
      themeTokens.color.canvas('#fff8f1'),
      themeTokens.color.surface('#ffffff'),
      themeTokens.color.surfaceRaised('#fff0df'),
      themeTokens.color.text('#271710'),
      themeTokens.color.muted('#7a6358'),
      themeTokens.color.border('rgba(194, 65, 12, 0.32)'),
      themeTokens.color.accent('#c2410c'),
      themeTokens.color.accentSoft('#ffead5'),
      themeTokens.color.accentText('#ffffff'),
      themeTokens.color.warning('#9a3412'),
      themeTokens.color.warningSoft('#ffedd5'),
      themeTokens.shadow.panel('0 18px 44px rgba(120, 53, 15, 0.13)'),
      themeTokens.shadow.floating('0 10px 24px rgba(120, 53, 15, 0.16)'),
    ]),
  },
];

export type NextThemeId = typeof nextThemes[number]['id'];

export function getNextThemeById(id: string | string[] | undefined) {
  const value = Array.isArray(id) ? id[0] : id;
  return nextThemes.find((item) => item.id === value) ?? nextThemes[0];
}

const layoutBase = style.raw({
  boxSizing: 'border-box',
  display: 'grid',
  gap: themeTokens.space.panel,
});

const compactTitle = style.plain({
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: 'uppercase',
});

export const themeExampleStyles = {
  shell: style.slot({
    ...layoutBase,
    backgroundColor: themeTokens.color.canvas,
    borderColor: themeTokens.color.border,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: themeTokens.radius.panel,
    boxShadow: themeTokens.shadow.panel,
    color: themeTokens.color.text,
    padding: 24,
  }).media('(max-width: 720px)', {
    padding: 18,
  }),
  hero: style.slot({
    display: 'grid',
    gap: 12,
  }),
  eyebrow: style.slot({
    color: themeTokens.color.accent,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  }),
  title: style.slot({
    color: themeTokens.color.text,
    fontSize: 'clamp(2.1rem, 5vw, 4.4rem)',
    fontWeight: 850,
    letterSpacing: 0,
    lineHeight: 0.98,
    margin: 0,
    maxWidth: 850,
  }),
  intro: style.slot({
    color: themeTokens.color.muted,
    fontSize: 16,
    lineHeight: 1.62,
    margin: 0,
    maxWidth: 720,
  }),
  board: style.slot({
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.75fr)',
  }).media('(max-width: 820px)', {
    gridTemplateColumns: '1fr',
  }),
  panel: style.slot({
    ...layoutBase,
    alignContent: 'start',
    backgroundColor: themeTokens.color.surface,
    borderColor: themeTokens.color.border,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: themeTokens.radius.panel,
    boxShadow: themeTokens.shadow.floating,
    minHeight: 220,
    padding: 20,
    transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
  }),
  panelTitle: style.slot({
    ...compactTitle,
    color: themeTokens.color.accent,
  }),
  panelText: style.slot({
    color: themeTokens.color.muted,
    fontSize: 15,
    lineHeight: 1.55,
    margin: 0,
  }),
  metricGrid: style.slot({
    display: 'grid',
    gap: themeTokens.space.row,
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  }).media('(max-width: 680px)', {
    gridTemplateColumns: '1fr',
  }),
  metric: style.slot({
    backgroundColor: themeTokens.color.surfaceRaised,
    borderColor: themeTokens.color.border,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: themeTokens.radius.control,
    display: 'grid',
    gap: 8,
    padding: 14,
    transition: 'background-color 140ms ease, border-color 140ms ease',
  }),
  metricLabel: style.slot({
    color: themeTokens.color.muted,
    fontSize: 12,
    fontWeight: 750,
    textTransform: 'uppercase',
  }),
  metricValue: style.slot({
    color: themeTokens.color.text,
    fontSize: 26,
    fontWeight: 850,
    lineHeight: 1,
  }),
  warning: style.slot({
    backgroundColor: themeTokens.color.warningSoft,
    borderRadius: themeTokens.radius.pill,
    color: themeTokens.color.warning,
    fontSize: 12,
    fontWeight: 800,
    marginTop: 10,
    padding: '7px 10px',
    width: 'fit-content',
  }),
  switcher: style.slot({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  }),
  button: style.slot({
    alignItems: 'center',
    backgroundColor: themeTokens.color.accentSoft,
    borderColor: themeTokens.color.border,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: themeTokens.radius.control,
    color: themeTokens.color.accent,
    cursor: 'pointer',
    display: 'inline-flex',
    fontSize: 14,
    fontWeight: 800,
    justifyContent: 'center',
    minHeight: 38,
    padding: '9px 12px',
    textDecoration: 'none',
    transition: 'background-color 140ms ease, color 140ms ease, transform 140ms ease',
  }).hover({
    backgroundColor: themeTokens.color.accent,
    color: themeTokens.color.accentText,
  }).active({
    transform: 'translateY(1px)',
  }),
  activeButton: style.slot({
    backgroundColor: themeTokens.color.accent,
    color: themeTokens.color.accentText,
  }),
};

export const themePanelScope = style.scope([
  themeExampleStyles.panel({
    borderColor: themeTokens.color.accent,
  }),
  themeExampleStyles.panelTitle({
    color: themeTokens.color.warning,
  }),
]).hover([
  themeExampleStyles.panel({
    boxShadow: themeTokens.shadow.panel,
  }),
  themeExampleStyles.metric({
    backgroundColor: themeTokens.color.accentSoft,
    borderColor: themeTokens.color.accent,
  }),
]).active([
  themeExampleStyles.panel({
    backgroundColor: themeTokens.color.surfaceRaised,
    borderColor: themeTokens.color.warning,
  }),
  themeExampleStyles.panelTitle({
    color: themeTokens.color.accent,
  }),
]);
