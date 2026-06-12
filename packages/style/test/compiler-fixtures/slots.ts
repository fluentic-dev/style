import { style } from '@fluentic/style';
import { cardBase, palette, textBase } from './shared';

export const importedButton: any = style.slot({
  ...cardBase,
  color: palette.accent,
}).hover({
  color: palette.accentHover,
});

export const importedSlots: any = {
  label: style.slot(textBase),
  icon: style.slot({
    color: palette.muted,
    padding: 4,
  }),
};
