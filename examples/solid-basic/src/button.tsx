import type { StyleProp, StyleTheme } from '@fluentic/style';
import { ButtonBase } from './button-base';
import { buttonTheme, primaryButtonTheme } from './styles';

type ButtonProps = {
  children?: any;
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
