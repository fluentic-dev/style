import { createTokens } from '@fluentic/style';

export const tokens = createTokens({
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
    page: 28,
    panel: 18,
    row: 10,
  },
  shadow: {
    panel: '0 18px 46px rgba(26, 44, 38, 0.10)',
    floating: '0 10px 26px rgba(26, 44, 38, 0.12)',
  },
});
