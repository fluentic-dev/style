import { BUILDER_TYPE_THEME } from '../data/const';
import type { ThemeData } from '../data/data';
import { createExtractedData } from './utils';

export function createExtractedTheme(
  id: string,
  className: string,
): ThemeData {
  return {
    ...createExtractedData(BUILDER_TYPE_THEME),
    id,
    className,
    tokens: [],
  } as unknown as ThemeData;
}
