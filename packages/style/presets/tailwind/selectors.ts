import { selector, selectorPriority } from '../../selector';
import { PrioritySelectors } from '../../selector/presets';

export const TailwindResponsiveSelectors = {
  sm: selector('@media (min-width: 640px)', 'media'),
  md: selector('@media (min-width: 768px)', 'media'),
  lg: selector('@media (min-width: 1024px)', 'media'),
  xl: selector('@media (min-width: 1280px)', 'media'),
  xxl: selector('@media (min-width: 1536px)', 'media'),
};

export const TailwindDarkSelector = selector(':where(.dark, .dark *)');

export const TailwindSelectors = selectorPriority({
  ...PrioritySelectors,
  ...TailwindResponsiveSelectors,
  dark: TailwindDarkSelector,
}, [
  'link',
  'visited',
  'hover',
  'focusWithin',
  'focus',
  'focusVisible',
  'active',
  'disabled',
]);
