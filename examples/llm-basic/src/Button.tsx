import { bindScope, combineStyle, type StyleProp, type StyleTheme } from '@fluentic/style';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { ButtonStyle, compact, outline } from './button.styles';

type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'css'> & {
  css?: StyleProp;
  theme?: StyleTheme;
  size?: 'regular' | 'compact';
  appearance?: 'solid' | 'outline';
  icon?: ReactNode;
};

export function Button({
  css: outsideCss,
  theme,
  size = 'regular',
  appearance = 'solid',
  icon,
  children,
  type = 'button',
  ...native
}: ButtonProps) {
  const css = combineStyle(
    ButtonStyle,
    bindScope(
      ButtonStyle.root,
      size === 'compact' && compact,
      appearance === 'outline' && outline,
      theme,
    ),
  );
  return (
    <button {...native} type={type} css={[css.root, outsideCss]}>
      {icon && <span aria-hidden='true' css={css.icon}>{icon}</span>}
      <span css={css.label}>{children}</span>
    </button>
  );
}
