import type { ElementDebugData, StyleProp } from '../types';

export type ElementMarkerStyleProp = {
  debug: ElementDebugData | undefined;
  styleProp: StyleProp | undefined;
};

export function splitElementMarkerStyleProp(styleProp: StyleProp): ElementMarkerStyleProp {
  if (isElementDebugData(styleProp)) {
    return { debug: styleProp, styleProp: undefined };
  }

  if (!Array.isArray(styleProp) || !isElementDebugData(styleProp[0])) {
    return { debug: undefined, styleProp };
  }

  return {
    debug: styleProp[0],
    styleProp: styleProp.length > 2 ? styleProp.slice(1) : styleProp[1] as StyleProp | undefined,
  };
}

export function isElementDebugData(value: unknown): value is ElementDebugData {
  if (!value || typeof value !== 'object') return false;

  return (value as Partial<ElementDebugData>).$$elementDebug === true;
}
