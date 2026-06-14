import { createTheme } from '@fluentic/style';
import { tokens } from './tokens';

const themeSpring = createTheme([
  tokens.color.canvas('#f5f7f6'),
  tokens.color.surface('#ffffff'),
  tokens.color.surfaceRaised('#eef4f1'),
  tokens.color.text('#15211d'),
  tokens.color.muted('#60716a'),
  tokens.color.border('#d8e3df'),
  tokens.color.accent('#0f766e'),
  tokens.color.accentSoft('#d8f3ee'),
  tokens.color.accentText('#ffffff'),
  tokens.color.warning('#b45309'),
  tokens.color.warningSoft('#fff4d7'),
  tokens.shadow.panel('0 18px 46px rgba(26, 44, 38, 0.10)'),
  tokens.shadow.floating('0 10px 26px rgba(26, 44, 38, 0.12)'),
]);

const themeNight = createTheme([
  tokens.color.canvas('#101514'),
  tokens.color.surface('#18211f'),
  tokens.color.surfaceRaised('#21302c'),
  tokens.color.text('#eef8f4'),
  tokens.color.muted('#a6bbb3'),
  tokens.color.border('#31443e'),
  tokens.color.accent('#5eead4'),
  tokens.color.accentSoft('#123d38'),
  tokens.color.accentText('#06201c'),
  tokens.color.warning('#fbbf24'),
  tokens.color.warningSoft('#3d2f11'),
  tokens.shadow.panel('0 22px 52px rgba(0, 0, 0, 0.34)'),
  tokens.shadow.floating('0 12px 28px rgba(0, 0, 0, 0.32)'),
]);

const themeEmber = createTheme([
  tokens.color.canvas('#fff8f1'),
  tokens.color.surface('#ffffff'),
  tokens.color.surfaceRaised('#fff0df'),
  tokens.color.text('#271710'),
  tokens.color.muted('#7a6358'),
  tokens.color.border('#efd7c8'),
  tokens.color.accent('#c2410c'),
  tokens.color.accentSoft('#ffead5'),
  tokens.color.accentText('#ffffff'),
  tokens.color.warning('#9a3412'),
  tokens.color.warningSoft('#ffedd5'),
  tokens.shadow.panel('0 18px 44px rgba(120, 53, 15, 0.13)'),
  tokens.shadow.floating('0 10px 24px rgba(120, 53, 15, 0.16)'),
]);

const themeMono = createTheme([
  tokens.color.canvas('#f4f4f5'),
  tokens.color.surface('#ffffff'),
  tokens.color.surfaceRaised('#e4e4e7'),
  tokens.color.text('#18181b'),
  tokens.color.muted('#71717a'),
  tokens.color.border('#d4d4d8'),
  tokens.color.accent('#27272a'),
  tokens.color.accentSoft('#e4e4e7'),
  tokens.color.accentText('#ffffff'),
  tokens.color.warning('#52525b'),
  tokens.color.warningSoft('#f4f4f5'),
  tokens.shadow.panel('0 18px 40px rgba(39, 39, 42, 0.10)'),
  tokens.shadow.floating('0 10px 24px rgba(39, 39, 42, 0.12)'),
]);

export const themes = [
  { theme: themeSpring, label: 'Spring' },
  { theme: themeNight, label: 'Night' },
  { theme: themeEmber, label: 'Ember' },
  { theme: themeMono, label: 'Mono' },
];
