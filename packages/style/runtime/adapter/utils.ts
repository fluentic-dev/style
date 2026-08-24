import type { ClassNameProps, ClassNameResult } from '../core/className';
import type { StyleProp } from '../types';

export type JsxCssPropStyleMode = 'react' | 'solid';

export type JsxCssPropMergeOptions = {
  classProp: 'class' | 'className';
  styleProp: 'style';
  styleMode: JsxCssPropStyleMode;
  preserveResultProps?: boolean;
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
    let cssProps: StyleProp[] | null = null;

    for (let index = 0; index < parts.length; index++) {
      const result = mergePart(props, parts[index]);
      props = result.props;

      if (result.css) {
        if (!cssProps) cssProps = [];
        cssProps.push(result.css);
      }
    }

    return mergeCssProps(props ?? {}, cssProps, getClassName, options);
  };
}

function mergePart(
  props: JsxCssPropInput | null,
  part: unknown,
) {
  if (!part) return { css: null, props };

  const next = props ? { ...props } : {};
  const attrs = part as JsxCssPropInput;
  const css = attrs.css;

  for (const key in attrs) {
    if (key !== 'css') next[key] = attrs[key];
  }

  return {
    css: css ? css as StyleProp : null,
    props: next,
  };
}

function mergeCssProps(
  props: JsxCssPropInput,
  cssProps: StyleProp[] | null,
  getClassName: GetClassNameFn,
  options: JsxCssPropMergeOptions,
) {
  if (!cssProps?.length) return props;

  const className = getClassName(cssProps.length === 1 ? cssProps[0] : cssProps, {
    className: getClassValue(props, options.classProp),
    style: props[options.styleProp] as ClassNameProps['style'],
  });

  delete props.class;
  delete props.className;

  if (className.className !== undefined) {
    props[options.classProp] = className.className;
  }

  if (className.style !== undefined) {
    props[options.styleProp] = options.styleMode === 'solid'
      ? toSolidStyle(className.style as Record<string, unknown>)
      : className.style;
  }

  if (options.preserveResultProps) {
    for (const key in className) {
      if (key === 'className' || key === 'style') continue;

      props[key] = className[key as keyof ClassNameResult];
    }
  }

  return props;
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
