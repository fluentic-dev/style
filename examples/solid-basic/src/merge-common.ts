import { style } from '@fluentic/style';

export const sharedControlBase = style({
  outline: '2px solid transparent',
  outlineOffset: 3,
}).hover({
  transform: 'translateY(-2px)',
});

export const sharedControlInteraction = style({
  transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, opacity 160ms ease',
}).merge(sharedControlBase).active({
  opacity: 0.9,
  transform: 'translateY(0)',
});
