import { style } from '@fluentic/style';
import { palette, textBase, textStrong } from './shared';
import { importedButton, importedSlots } from './slots';

type StyleRule = ReturnType<typeof style>;
type ScopeRule = ReturnType<typeof style.scope.media>;

const localText = {
  ...textBase,
  lineHeight: '20px',
};

const localSurface = {
  backgroundColor: palette.surface,
};

export const heading: StyleRule = style({
  ...localText,
  ...localSurface,
}).hover(textStrong);

export const localSlot: any = style.slot({
  ...localText,
  color: palette.muted,
}).media('(max-width: 800px)', {
  fontSize: 12,
});

export const localSlots: any = {
  root: style.slot({
    display: 'grid',
    color: palette.ink,
  }),
  label: style.slot(textBase),
};

export const compactScope: ScopeRule = style.scope().media('(max-width: 700px)', [
  importedButton({
    color: palette.ink,
  }),
  importedSlots.label({
    color: palette.accent,
  }),
  localSlot({
    color: palette.accentHover,
  }),
]);

export const objectScope: ScopeRule = style.scope().media('(max-width: 600px)', [
  localSlots.root({
    display: 'block',
  }),
  localSlots.label({
    color: palette.muted,
  }),
]);
