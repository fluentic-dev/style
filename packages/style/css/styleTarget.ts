import { getClassName } from '../runtime/core';
import type { StyleProp } from '../runtime/types';

export type StyleTargetApplyOptions = {
  enabled?: boolean;
};

export type StyleTarget = {
  apply(target: Element | null | undefined, css: StyleProp, options?: StyleTargetApplyOptions): void;
  destroy(): void;
};

type TargetState = {
  classNames: Set<string>;
  styleValues: Map<string, string>;
  signature: string;
};

export function createStyleTarget(): StyleTarget {
  const targets = new Map<Element, TargetState>();

  return {
    apply(target, css, options) {
      if (!target) return;

      if (options?.enabled === false) {
        clearTarget(targets, target);
        return;
      }

      const result = getClassName(css);
      const classNames = new Set(result.className?.split(/\s+/).filter(Boolean) ?? []);
      const styleEntries = Object.entries(result.style ?? {});
      const signature = createSignature(classNames, styleEntries);
      const previous = targets.get(target);

      if (previous?.signature === signature) return;

      const state: TargetState = previous ?? {
        classNames: new Set(),
        styleValues: new Map(),
        signature: '',
      };

      removeOldClasses(target, state.classNames, classNames);
      addNewClasses(target, state.classNames, classNames);
      applyStyles(target as HTMLElement, state.styleValues, styleEntries);

      state.classNames = classNames;
      state.signature = signature;
      targets.set(target, state);
    },

    destroy() {
      targets.forEach((_, target) => clearTarget(targets, target));
    },
  };
}

function createSignature(
  classNames: Set<string>,
  styleEntries: [string, unknown][],
) {
  let signature = [...classNames].sort().join(' ');

  for (let i = 0, len = styleEntries.length; i < len; i++) {
    const [name, value] = styleEntries[i];
    signature += `\n${name}:${String(value)}`;
  }

  return signature;
}

function removeOldClasses(
  target: Element,
  previous: Set<string>,
  next: Set<string>,
) {
  previous.forEach((className) => {
    if (!next.has(className)) target.classList.remove(className);
  });
}

function addNewClasses(
  target: Element,
  previous: Set<string>,
  next: Set<string>,
) {
  next.forEach((className) => {
    if (!previous.has(className)) target.classList.add(className);
  });
}

function applyStyles(
  target: HTMLElement,
  previousValues: Map<string, string>,
  nextEntries: [string, unknown][],
) {
  const nextNames = new Set<string>();

  for (let i = 0, len = nextEntries.length; i < len; i++) {
    const [name, value] = nextEntries[i];
    nextNames.add(name);

    if (!previousValues.has(name)) {
      previousValues.set(name, target.style.getPropertyValue(name));
    }

    target.style.setProperty(name, String(value));
  }

  previousValues.forEach((previousValue, name) => {
    if (nextNames.has(name)) return;

    restoreStyleValue(target, name, previousValue);
    previousValues.delete(name);
  });
}

function clearTarget(
  targets: Map<Element, TargetState>,
  target: Element,
) {
  const state = targets.get(target);
  if (!state) return;

  state.classNames.forEach((className) => target.classList.remove(className));
  state.styleValues.forEach((previousValue, name) => {
    restoreStyleValue(target as HTMLElement, name, previousValue);
  });

  targets.delete(target);
}

function restoreStyleValue(
  target: HTMLElement,
  name: string,
  value: string,
) {
  if (value) target.style.setProperty(name, value);
  else target.style.removeProperty(name);
}
