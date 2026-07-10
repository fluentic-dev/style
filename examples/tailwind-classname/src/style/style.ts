import { createClassNameFn, createToken } from '@fluentic/style';
import { createDefaultedTailwindStyleConfig, createTailwindClassNamePreset } from '@fluentic/style/presets/tailwind';
import { Colors } from './colors';

const tailwindConfig = createDefaultedTailwindStyleConfig({
  theme: {
    colors: Colors,
    spacing: {
      18: '4.5rem',
      112: '28rem',
    },
    sizes: {
      content: 'min(100%, 1160px)',
      card: '14.5rem',
    },
  },
});

const tailwind = createTailwindClassNamePreset(tailwindConfig);

export const { className: cx } = createClassNameFn({
  selectors: tailwind.selectors,
  transform: tailwind.transform,
});

export const focusRing = createToken('0 0 0 3px rgb(56 189 248 / 0.35)');
