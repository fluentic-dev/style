import { createCombinedStyleGetter } from './combine';
import { runtimeTokenValueResolver } from './token';

export const getCombinedStyle = createCombinedStyleGetter(runtimeTokenValueResolver);
