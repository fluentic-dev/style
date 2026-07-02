import { BUILDER_TYPE_THEME } from '../data/const';
import type { ThemeData } from '../data/data';
import { createExtractedData } from './utils';

export function createExtractedTheme(
  id: string,
  className: string,
): ThemeData {
  const data = createExtractedData(BUILDER_TYPE_THEME) as unknown as ThemeData;

  data.id = id;
  data.className = className;
  data.tokens = [];

  return data;
}
