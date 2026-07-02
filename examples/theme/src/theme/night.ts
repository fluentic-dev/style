import { createTheme, style } from '@fluentic/style';
import { CardStyle } from '../components/Card';
import { tokens } from '../tokens';

export const nightTheme = {
  label: 'Night',
  theme: createTheme([
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
  ]),
  card: style.scope([
    CardStyle.root({
      borderColor: '#42625a',
    }),
    CardStyle.metric({
      backgroundColor: '#18211f',
    }),
  ]),
};
