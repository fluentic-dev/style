import { createTokens, style } from '@fluentic/style';

// Component contracts are independent of any app palette.
export const ButtonTokens = createTokens({
  background: '#0f766e',
  foreground: '#ffffff',
  focus: '#0f766e',
});

export const ButtonStyle = {
  tokens: ButtonTokens,
  root: style.slot({
    alignItems: 'center',
    backgroundColor: ButtonTokens.background,
    border: 0,
    borderRadius: 8,
    color: ButtonTokens.foreground,
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: 'inherit',
    gap: 8,
    padding: '10px 16px',
  }).hover({ opacity: 0.88 })
    .focusVisible({ outline: '2px solid', outlineColor: ButtonTokens.focus, outlineOffset: 3 })
    .disabled({ cursor: 'not-allowed', opacity: 0.45 }),
  icon: style.slot({ display: 'inline-flex', fontSize: 18 }),
  label: style.slot({ fontSize: 16, fontWeight: 600 }),
};

export const compact = style.scope([
  ButtonStyle.root({ padding: '6px 10px' }),
  ButtonStyle.label({ fontSize: 14 }),
]);

export const outline = style.scope([
  ButtonStyle.root({
    backgroundColor: 'transparent',
    border: '1px solid currentColor',
    color: 'inherit',
  }),
]);
