import { selectorPriority } from '../selector';
import { PrioritySelectors } from './default';
import {
  ArgSelectors,
  AtRuleSelectors,
  PseudoArgSelectors,
  PseudoElementSelectors,
  PseudoSelectors,
} from './selectors';

export const MinimalSelectors = {
  hover: PseudoSelectors.hover,
  active: PseudoSelectors.active,
  focus: PseudoSelectors.focus,
  focusWithin: PseudoSelectors.focusWithin,
  disabled: PseudoSelectors.disabled,

  firstChild: PseudoSelectors.firstChild,
  lastChild: PseudoSelectors.lastChild,

  nthChild: PseudoArgSelectors.nthChild,
  nthOfType: PseudoArgSelectors.nthOfType,

  is: PseudoArgSelectors.is,
  where: PseudoArgSelectors.where,
  not: PseudoArgSelectors.not,
  has: PseudoArgSelectors.has,

  ...PseudoElementSelectors,
  ...ArgSelectors,
  ...AtRuleSelectors,
};

export const MinimalPrioritySelectors = selectorPriority(
  MinimalSelectors,
  PrioritySelectors,
);
