import { createTheme, style } from '@fluentic/style';
import { CardStyle } from '../components/Card';
import { tokens } from '../tokens';

export const springTheme = {
  label: 'Spring',
  theme: createTheme([
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
  ]),
  card: style.scope([
    CardStyle.root({
      borderColor: '#b7ddd6',
    }),
    CardStyle.secondaryAction({
      backgroundColor: '#ffffff',
    }),
  ]),
};
