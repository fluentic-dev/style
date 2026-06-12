import { selectorPriority } from '../selector';
import {
  ArgSelectors,
  AtRuleSelectors,
  PseudoArgSelectors,
  PseudoElementSelectors,
  PseudoSelectors,
} from './selectors';

export const Selectors = {
  ...PseudoSelectors,
  ...PseudoElementSelectors,
  ...PseudoArgSelectors,
  ...ArgSelectors,
  ...AtRuleSelectors,
};

export const PrioritySelectors = selectorPriority(Selectors, [
  'link',
  'visited',
  'hover',
  'focusWithin',
  'focus',
  'focusVisible',
  'active',
  'disabled',
]);
