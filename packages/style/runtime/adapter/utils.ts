import type { ClassNameProps, ClassNameResult } from '../core/className';
import type { StyleProp } from '../types';

export type JsxCssPropStyleMode = 'react' | 'solid';

export type JsxCssPropMergeOptions = {
  classProp: 'class' | 'className';
  styleProp: 'style';
  styleMode: JsxCssPropStyleMode;
};

export type JsxCssPropInput = Record<PropertyKey, unknown>;

export type GetClassNameFn = (
  styleProp: StyleProp,
  props?: ClassNameProps,
) => ClassNameResult;

export function createMergeJsxProps(
  getClassName: GetClassNameFn,
  options: JsxCssPropMergeOptions,
) {
  return function mergeJsxProps(parts: readonly unknown[]) {
    let props: JsxCssPropInput | null = null;

    for (let index = 0; index < parts.length; index++) {
      props = mergePart(props, parts[index], getClassName, options);
    }

    return props ?? {};
  };
}

function mergePart(
  props: JsxCssPropInput | null,
  part: unknown,
  getClassName: GetClassNameFn,
  options: JsxCssPropMergeOptions,
) {
  if (!part) return props;

  const next = props ? { ...props } : {};
  const attrs = part as JsxCssPropInput;
  const css = attrs.css;

  for (const key in attrs) {
    if (key !== 'css') next[key] = attrs[key];
  }

  if (!css) return next;

  const className = getClassName(css as StyleProp, {
    className: getClassValue(next, options.classProp),
    style: next[options.styleProp] as ClassNameProps['style'],
  });

  delete next.class;
  delete next.className;

  if (className.className !== undefined) {
    next[options.classProp] = className.className;
  }

  if (className.style !== undefined) {
    next[options.styleProp] = options.styleMode === 'solid'
      ? toSolidStyle(className.style as Record<string, unknown>)
      : className.style;
  }

  return next;
}

function getClassValue(
  props: JsxCssPropInput,
  classProp: 'class' | 'className',
) {
  return (props[classProp] ?? props[classProp === 'class' ? 'className' : 'class']) as ClassNameProps['className'];
}

function toSolidStyle(style: Record<string, unknown>) {
  const next: Record<string, unknown> = {};

  for (const key in style) {
    next[toCssPropertyName(key)] = style[key];
  }

  return next;
}

function toCssPropertyName(key: string) {
  if (key.startsWith('--') || key.includes('-')) return key;

  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
