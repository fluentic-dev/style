import { createStyleFn } from '@fluentic/style';
import { createNamedTokens } from '@fluentic/style/dialect';
import {
  createDefaultedTailwindStyleConfig,
  createTailwindExtendedStyleTransform,
  TailwindSelectors,
} from '@fluentic/style/presets/tailwind';

export const Colors = createNamedTokens('snapshot.tailwind.color', {
  blue: {
    600: '#2563eb',
  },
  emerald: {
    600: '#059669',
  },
  accent: '#0f766e',
  accentHover: '#115e59',
  accentSoft: '#d9f4ee',
  border: '#d8e5e0',
  panel: '#ffffff',
  panelRaised: '#eef7f4',
});

const tailwindConfig = createDefaultedTailwindStyleConfig({
  theme: {
    colors: Colors,
    spacing: {
      18: '4.5rem',
    },
    sizes: {
      card: '14.5rem',
    },
  },
});

export const { style: tw } = createStyleFn({
  selectors: TailwindSelectors,
  transform: createTailwindExtendedStyleTransform(tailwindConfig),
});

export const snapshotImportSources = [
  { source: './style', name: 'tw', styleFn: tw },
];
