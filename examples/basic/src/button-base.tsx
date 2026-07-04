import { bindScope, combineStyle } from '@fluentic/style';
import type { StyleProp, StyleTheme } from '@fluentic/style';
import type { ReactNode } from 'react';
import { buttonBaseState, buttonBaseStyles } from './styles';

type ButtonBaseProps = {
  children: ReactNode;
  css?: StyleProp;
  debugTarget?: string;
  theme?: StyleTheme;
};

export function ButtonBase(props: ButtonBaseProps) {
  const target = buttonBaseStyles.container;

  const css = combineStyle(
    buttonBaseStyles,
    bindScope(target, buttonBaseState, props.theme),
  );

  return (
    <button css={[css.container, props.css]} data-debug-target={props.debugTarget}>
      <span css={css.label}>{props.children}</span>
    </button>
  );
}
