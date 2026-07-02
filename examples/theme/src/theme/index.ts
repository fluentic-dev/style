export * from '../styles';
export * from '../tokens';
export * from './ember';
export * from './mono';
export * from './night';
export * from './spring';

import { emberTheme } from './ember';
import { monoTheme } from './mono';
import { nightTheme } from './night';
import { springTheme } from './spring';

export const themes = [
  springTheme,
  nightTheme,
  emberTheme,
  monoTheme,
];
