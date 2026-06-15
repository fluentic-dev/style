import { style } from '@fluentic/style';

export const sharedControl = style({
  borderColor: '#94a3b8',
}).hover({
  color: '#2563eb',
});

export const sharedInteractive = style({
  backgroundColor: '#ffffff',
}).merge(sharedControl).active({
  color: '#dc2626',
});
