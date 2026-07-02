import type { AnyBuilderData, SlotData } from '../../builder/data';
import { isSlotData } from '../../builder/data';
import { isStyleTokenData, type StyleTokenData } from '../token';

type ExposedStyleItem<T> = T extends StyleTokenData ? T
  : T extends SlotData ? T
  : T extends AnyBuilderData ? never
  : T extends readonly unknown[] ? never
  : T extends object ? ExposedStyle<T>
  : never;

export type ExposedStyle<T> = {
  [K in keyof T as ExposedStyleItem<T[K]> extends never ? never : K]: ExposedStyleItem<T[K]>;
};

export function exposeStyle<T extends object>(styles: T): ExposedStyle<T> {
  return exposeStyleObject(styles) as ExposedStyle<T>;
}

function exposeStyleObject(source: object) {
  const result: Record<PropertyKey, unknown> = {};

  for (const key of Reflect.ownKeys(source)) {
    if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;

    const exposed = exposeStyleValue((source as Record<PropertyKey, unknown>)[key]);

    if (exposed !== undefined) {
      result[key] = exposed;
    }
  }

  return result;
}

function exposeStyleValue(value: unknown): unknown {
  if (isStyleTokenData(value) || isSlotData(value)) return value;

  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const exposed = exposeStyleObject(value);
  return Reflect.ownKeys(exposed).length > 0 ? exposed : undefined;
}
