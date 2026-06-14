import { createTheme } from '@fluentic/style';
import { brand, tokens } from './theme_cross_tokens';

export const lightTheme = createTheme([
  tokens.color.text('#0f172a'),
  tokens.color.surface(brand),
  tokens.space.panel(32),
]);
