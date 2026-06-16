import { combineStyle, style } from '@fluentic/style';
import type { StyleProp } from '@fluentic/style';
import { createKeyframes } from '@fluentic/style/css';
import { Button } from './button';
import { sharedControlInteraction } from './merge-common';
import { buttonBaseStyles, pageStyles, pageTheme } from './styles';
import { appTheme } from './tokens';

type PageProps = {
  css?: StyleProp;
};

const cancelButtonTheme = style.scope([
  buttonBaseStyles.container({
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
    color: '#111827',
  }),
]);

const mergedCancelButtonTheme = style.scope()
  .merge(cancelButtonTheme)
  .hover([
    buttonBaseStyles.container({
      borderColor: '#94a3b8',
    }),
  ]);

const mergedButtonStyle = style({
  backgroundColor: '#7c3aed',
  boxShadow: '0 12px 28px rgba(124, 58, 237, 0.25)',
}).merge(sharedControlInteraction).focusVisible({
  outlineColor: '#a78bfa',
});

const pulseIn = createKeyframes({
  from: {
    opacity: 0.35,
    transform: 'translateY(10px) scale(0.98)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  },
});

const keyframeBadge = style({
  alignSelf: 'flex-start',
  padding: '8px 12px',
  borderRadius: 999,
  backgroundColor: '#eef2ff',
  color: '#3730a3',
  fontSize: 13,
  fontWeight: 700,
  animationName: pulseIn,
  animationDuration: '900ms',
  animationTimingFunction: 'ease-out',
  animationIterationCount: 3,
  animationDirection: 'alternate',
});

export function Page(props: PageProps) {
  const css = combineStyle(pageStyles, pageTheme(pageStyles.container));

  return (
    <main css={[appTheme, css.container, props.css]}>
      <div css={css.panel}>
        <p css={css.eyebrow}>Basic example</p>
        <h1 css={css.title}>Style primitives, rendered cleanly.</h1>
        <p css={css.description}>
          A small demo of tokens, slots, scoped themes, and state styles working together in a React view.
        </p>
        <div css={keyframeBadge}>Keyframes are wired</div>
        <div css={css.actions}>
          <Button>Save</Button>
          <Button theme={mergedCancelButtonTheme}>
            Cancel
          </Button>
          <Button css={mergedButtonStyle}>
            Merge
          </Button>
        </div>
      </div>
    </main>
  );
}
