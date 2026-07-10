import type { TokenTheme } from '@fluentic/style';
import { Themes } from '../style/theme';

export type ThemeOption = {
  name: string;
  theme: TokenTheme;
};

export const themeOptions: ThemeOption[] = [
  { name: 'mint', theme: Themes.mint },
  { name: 'indigo', theme: Themes.indigo },
  { name: 'night', theme: Themes.night },
];
