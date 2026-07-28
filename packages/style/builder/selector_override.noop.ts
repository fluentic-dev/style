import {
  assertManualSelectorSyntax,
  type ManualSelectorInput,
  normalizeManualSelectors as normalizeManualSelectorsCore,
} from './selector_override_core';

export type { ManualSelectorInput } from './selector_override_core';

export function normalizeManualSelectors(input: ManualSelectorInput) {
  return normalizeManualSelectorsCore(input, assertManualSelectorSyntax);
}
