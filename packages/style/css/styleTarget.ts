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

type SharedTargetState = {
  classNames: Map<string, number>;
  styleNames: Map<string, SharedStyleState>;
};

type SharedStyleState = {
  initialValue: string;
  owners: Map<object, string>;
};

const sharedTargets = new WeakMap<Element, SharedTargetState>();

export function createStyleTarget(): StyleTarget {
  const owner = {};
  const targets = new Map<Element, TargetState>();

  return {
    apply(target, css, options) {
      if (!target) return;

      if (options?.enabled === false) {
        clearTarget(targets, owner, target);
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

      updateClasses(target, state.classNames, classNames);
      updateStyles(target as HTMLElement, owner, state.styleValues, styleEntries);

      state.classNames = classNames;
      state.signature = signature;
      targets.set(target, state);
    },

    destroy() {
      targets.forEach((_, target) => clearTarget(targets, owner, target));
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

function updateClasses(
  target: Element,
  previous: Set<string>,
  next: Set<string>,
) {
  previous.forEach((className) => {
    if (!next.has(className)) removeClassName(target, className);
  });

  next.forEach((className) => {
    if (!previous.has(className)) addClassName(target, className);
  });
}

function addClassName(target: Element, className: string) {
  const state = getSharedTargetState(target);
  const count = state.classNames.get(className) ?? 0;

  if (count === 0) target.classList.add(className);

  state.classNames.set(className, count + 1);
}

function removeClassName(target: Element, className: string) {
  const state = getSharedTargetState(target);
  const count = state.classNames.get(className) ?? 0;

  if (count <= 1) {
    state.classNames.delete(className);
    target.classList.remove(className);
    deleteSharedStateIfEmpty(target, state);
    return;
  }

  state.classNames.set(className, count - 1);
}

function updateStyles(
  target: HTMLElement,
  owner: object,
  previousValues: Map<string, string>,
  nextEntries: [string, unknown][],
) {
  const nextNames = new Set<string>();

  for (let i = 0, len = nextEntries.length; i < len; i++) {
    const [name, value] = nextEntries[i];
    const nextValue = String(value);
    nextNames.add(name);

    if (previousValues.get(name) !== nextValue) {
      setStyleValue(target, owner, name, nextValue);
      previousValues.set(name, nextValue);
    }
  }

  previousValues.forEach((_, name) => {
    if (nextNames.has(name)) return;

    removeStyleValue(target, owner, name);
    previousValues.delete(name);
  });
}

function clearTarget(
  targets: Map<Element, TargetState>,
  owner: object,
  target: Element,
) {
  const state = targets.get(target);
  if (!state) return;

  state.classNames.forEach((className) => removeClassName(target, className));
  state.styleValues.forEach((_, name) => {
    removeStyleValue(target as HTMLElement, owner, name);
  });

  targets.delete(target);
}

function setStyleValue(
  target: HTMLElement,
  owner: object,
  name: string,
  value: string,
) {
  const targetState = getSharedTargetState(target);
  let styleState = targetState.styleNames.get(name);

  if (!styleState) {
    styleState = {
      initialValue: target.style.getPropertyValue(name),
      owners: new Map(),
    };
    targetState.styleNames.set(name, styleState);
  }

  styleState.owners.delete(owner);
  styleState.owners.set(owner, value);
  target.style.setProperty(name, value);
}

function removeStyleValue(
  target: HTMLElement,
  owner: object,
  name: string,
) {
  const targetState = getSharedTargetState(target);
  const styleState = targetState.styleNames.get(name);
  if (!styleState) return;

  styleState.owners.delete(owner);

  const currentValue = getLastStyleValue(styleState);

  if (currentValue !== null) {
    target.style.setProperty(name, currentValue);
    return;
  }

  targetState.styleNames.delete(name);
  restoreStyleValue(target, name, styleState.initialValue);
  deleteSharedStateIfEmpty(target, targetState);
}

function getLastStyleValue(styleState: SharedStyleState) {
  let value: string | null = null;

  styleState.owners.forEach((ownerValue) => {
    value = ownerValue;
  });

  return value;
}

function getSharedTargetState(target: Element) {
  let state = sharedTargets.get(target);

  if (!state) {
    state = {
      classNames: new Map(),
      styleNames: new Map(),
    };
    sharedTargets.set(target, state);
  }

  return state;
}

function deleteSharedStateIfEmpty(
  target: Element,
  state: SharedTargetState,
) {
  if (!state.classNames.size && !state.styleNames.size) {
    sharedTargets.delete(target);
  }
}

function restoreStyleValue(
  target: HTMLElement,
  name: string,
  value: string,
) {
  if (value) target.style.setProperty(name, value);
  else target.style.removeProperty(name);
}
