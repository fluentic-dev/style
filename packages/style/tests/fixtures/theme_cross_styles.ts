import { style } from '@fluentic/style';
import { tokens } from './theme_cross_tokens';

export const styles: any = {
  root: style.slot({
    backgroundColor: tokens.color.surface,
    color: tokens.color.text,
    padding: tokens.space.panel,
  }),
};
