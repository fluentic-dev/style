import { selector } from '../selector';

export const PseudoSelectors = {
  hover: selector(':hover'),
  active: selector(':active'),

  focus: selector(':focus'),
  focusVisible: selector(':focus-visible'),
  focusWithin: selector(':focus-within'),

  visited: selector(':visited'),
  link: selector(':link'),
  anyLink: selector(':any-link'),
  target: selector(':target'),

  disabled: selector(':disabled'),
  enabled: selector(':enabled'),

  checked: selector(':checked'),
  indeterminate: selector(':indeterminate'),

  invalid: selector(':invalid'),
  valid: selector(':valid'),

  required: selector(':required'),
  optional: selector(':optional'),

  readOnly: selector(':read-only'),
  readWrite: selector(':read-write'),

  inRange: selector(':in-range'),
  outOfRange: selector(':out-of-range'),

  default: selector(':default'),

  placeholderShown: selector(':placeholder-shown'),
  autofill: selector(':autofill'),

  empty: selector(':empty'),
  root: selector(':root'),

  firstChild: selector(':first-child'),
  lastChild: selector(':last-child'),
  onlyChild: selector(':only-child'),

  firstOfType: selector(':first-of-type'),
  lastOfType: selector(':last-of-type'),
  onlyOfType: selector(':only-of-type'),

  fullscreen: selector(':fullscreen'),
  modal: selector(':modal'),
};

export const PseudoElementSelectors = {
  before: selector('::before'),
  after: selector('::after'),
};

export const PseudoArgSelectors = {
  not: selector(':not($$)', 'arg'),
  is: selector(':is($$)', 'arg'),
  where: selector(':where($$)', 'arg'),
  has: selector(':has($$)', 'arg'),

  nthChild: selector(':nth-child($)', 'value'),
  nthLastChild: selector(':nth-last-child($)', 'value'),

  nthOfType: selector(':nth-of-type($)', 'value'),
  nthLastOfType: selector(':nth-last-of-type($)', 'value'),

  lang: selector(':lang($)', 'value'),
  dir: selector(':dir($)', 'value'),
};

export const ArgSelectors = {
  attr: selector('$', 'attr'),
  select: selector('$$', 'local'),
  merge: selector('...'),
};

export const AtRuleSelectors = {
  media: selector('@media $$', 'media'),
  container: selector('@container $$', 'container'),
  supports: selector('@supports $$', 'supports'),
};
