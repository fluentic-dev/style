import { createToken, createTokens } from '@fluentic/style';

export const brand = createToken('#0f766e');

export const tokens = createTokens({
  color: {
    text: '#15211d',
    surface: '#ffffff',
  },
  space: {
    panel: 24,
  },
});
