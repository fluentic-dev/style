import { createTheme, style } from '@fluentic/style';
import { CardStyle } from '../components/Card';
import { tokens } from '../tokens';

export const monoTheme = {
  label: 'Mono',
  theme: createTheme([
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
  ]),
  card: style.scope([
    CardStyle.root({
      borderColor: '#c4c4cc',
    }),
    CardStyle.metric({
      backgroundColor: '#f8f8f9',
    }),
  ]),
};
