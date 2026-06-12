import { scopeTarget, useCss } from '@fluentic/style';
import type { CssProp, CssTheme } from '@fluentic/style';
import type { ReactNode } from 'react';
import { buttonBaseState, buttonBaseStyles } from './styles';

type ButtonBaseProps = {
  children: ReactNode;
  css?: CssProp;
  theme?: CssTheme;
};

export function ButtonBase(props: ButtonBaseProps) {
  const target = buttonBaseStyles.container;

  const css = useCss(
    buttonBaseStyles,
    buttonBaseState(target),
    ...scopeTarget(target, props.theme),
  );

  return (
    <button css={[css.container, props.css]} scope={css}>
      <span css={css.label}>{props.children}</span>
    </button>
  );
}
