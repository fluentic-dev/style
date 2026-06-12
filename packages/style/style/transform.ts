import type { CSSProperties, StyleObject } from './types';

export type StyleTransform<Style = unknown> = {
  transform(style: StyleObject<Style>): StyleObject<CSSProperties>;
};

export function styleTransform<Style>(options: StyleTransform<Style>) {
  return options;
}
