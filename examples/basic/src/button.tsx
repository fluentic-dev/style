import type { StyleProp, StyleTheme } from '@fluentic/style';
import type { ReactNode } from 'react';
import { ButtonBase } from './button-base';
import { buttonTheme, primaryButtonTheme } from './styles';

type ButtonProps = {
  children: ReactNode;
  css?: StyleProp;
  debugTarget?: string;
  theme?: StyleTheme;
};

export function Button(props: ButtonProps) {
  const theme = [
    buttonTheme,
    primaryButtonTheme,
    props.theme,
  ];

  return (
    <ButtonBase css={props.css} debugTarget={props.debugTarget} theme={theme}>
      {props.children}
    </ButtonBase>
  );
}
