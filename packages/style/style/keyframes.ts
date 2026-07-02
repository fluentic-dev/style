import type { KeyframeSelector, KeyframesObject } from '../atomic/atRule/keyframes';
import { createKeyframes } from '../css';
import type { StableId } from '../utils/id';
import type { StyleTransform } from './transform';
import type { CSSProperties, StyleObject } from './types';

export type StyleKeyframesObject<Style = CSSProperties> = {
  [Selector in KeyframeSelector]?: StyleObject<Style>;
};

export function transformKeyframes<Style>(
  frames: StyleKeyframesObject<Style>,
  transform: StyleTransform<Style> | null,
): KeyframesObject {
  if (!transform) return frames as KeyframesObject;

  const result: KeyframesObject = {};

  for (const selector in frames) {
    const frame = frames[selector as KeyframeSelector];
    if (!frame) continue;

    result[selector as KeyframeSelector] = transform.transform(frame) as KeyframesObject[KeyframeSelector];
  }

  return result;
}

export function createStyleKeyframes<Style>(
  frames: StyleKeyframesObject<Style>,
  transform: StyleTransform<Style> | null,
  stableId?: StableId,
): ReturnType<typeof createKeyframes> {
  const create = createKeyframes as (
    frames: KeyframesObject,
    stableId?: StableId,
  ) => ReturnType<typeof createKeyframes>;

  return create(transformKeyframes(frames, transform), stableId);
}
