import { createToken, createTokens } from '@fluentic/style';

export const brand = createToken('blue');

export const tokens = createTokens({
  color: {
    text: 'black',
    bg: 'white',
  },
  radius: 4,
});
