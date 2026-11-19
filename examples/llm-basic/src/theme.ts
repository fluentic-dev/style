import { createTheme, createValues, style } from '@fluentic/style';
import { ButtonStyle } from './button.styles';

export const color = createValues([
  '#f5f7f6 | Canvas',
  '#15211d | Text',
  '#0f766e | Accent',
  '#ffffff | AccentText',
]);
export const space = createValues(['8px', '16px', '24px']);

export const lightTheme = createTheme([
  color('#f5f7f6 | Canvas', '#f5f7f6'),
  color('#15211d | Text', '#15211d'),
  color('#0f766e | Accent', '#0f766e'),
  color('#ffffff | AccentText', '#ffffff'),
]);
export const darkTheme = createTheme([
  color('#f5f7f6 | Canvas', '#101514'),
  color('#15211d | Text', '#eef8f4'),
  color('#0f766e | Accent', '#5eead4'),
  color('#ffffff | AccentText', '#101514'),
]);

// Scopes connect app values to component tokens; themes change the app values.
export const appButton = style.scope([
  ButtonStyle.tokens.background(color('#0f766e | Accent')),
  ButtonStyle.tokens.foreground(color('#ffffff | AccentText')),
  ButtonStyle.tokens.focus(color('#0f766e | Accent')),
]);

export const emphasized = style.scope([
  ButtonStyle.label({ letterSpacing: '0.04em' }),
  ButtonStyle.icon({ fontSize: 22 }),
]);
