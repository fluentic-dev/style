import { createTheme, style } from '@fluentic/style';
import { CardStyle } from '../components/Card';
import { tokens } from '../tokens';

export const emberTheme = {
  label: 'Ember',
  theme: createTheme([
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
  ]),
  card: style.scope([
    CardStyle.root({
      borderColor: '#f3c9ac',
    }),
    CardStyle.secondaryAction({
      backgroundColor: '#ffffff',
    }),
  ]),
};
