import type { CssProp, CssTheme } from '@fluentic/style';
import type { ReactNode } from 'react';
import { ButtonBase } from './button-base';
import { buttonTheme, primaryButtonTheme } from './styles';

type ButtonProps = {
  children: ReactNode;
  css?: CssProp;
  theme?: CssTheme;
};

export function Button(props: ButtonProps) {
  const theme = [
    buttonTheme,
    primaryButtonTheme,
    props.theme,
  ];

  return (
    <ButtonBase css={props.css} theme={theme}>
      {props.children}
    </ButtonBase>
  );
}
