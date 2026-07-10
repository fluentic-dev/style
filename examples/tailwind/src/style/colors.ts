import { createNamedTokens } from '@fluentic/style/dialect';
import { defaultTailwindColors } from '@fluentic/style/presets/tailwind';

export const Colors = createNamedTokens('example.tailwind.color', {
  ...defaultTailwindColors,
  canvas: '#f7faf9',
  panel: '#ffffff',
  panelRaised: '#eef7f4',
  text: '#10201b',
  muted: '#61746d',
  border: '#d8e5e0',
  accent: '#0f766e',
  accentHover: '#115e59',
  accentSoft: '#d9f4ee',
  accentText: '#ffffff',
  warning: '#b45309',
  warningSoft: '#fff2cf',
  danger: '#be123c',
  dangerSoft: '#ffe4e6',
});
