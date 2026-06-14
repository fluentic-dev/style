import { style } from '@fluentic/style';
import { palette, spacing } from './shared';

export const importedRawBase = style.raw({
  backgroundColor: palette.surface,
  padding: spacing.md,
});

export const importedPlainBase = style.plain({
  display: 'flex',
  gap: spacing.sm,
});
