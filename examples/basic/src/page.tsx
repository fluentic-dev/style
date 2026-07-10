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

const mergedCancelButtonTheme = style.scope([
  buttonBaseStyles.container({
    outline: '3px solid #38bdf8',
  }),
])
  .merge(cancelButtonTheme)
  .hover([
    buttonBaseStyles.container({
      borderColor: '#94a3b8',
    }),
  ]);

const styleMergeBase = style.raw({
  boxShadow: '0 12px 28px rgba(124, 58, 237, 0.25)',
});

const mergedButtonStyle = style({
  ...styleMergeBase,
  backgroundColor: '#7c3aed',
}).merge(sharedControlInteraction).focusVisible({
  outlineColor: '#a78bfa',
});

const slotChainBase = style.raw({
  backgroundColor: '#0f766e',
  boxShadow: '0 12px 28px rgba(15, 118, 110, 0.25)',
});

const localSlotMergeInteraction = style({
  outline: '3px solid #facc15',
  outlineOffset: 3,
}).hover({
  transform: 'translateY(-2px)',
});

const slotChainStyles = {
  container: style.slot({
    ...slotChainBase,
    color: '#ffffff',
    border: 0,
    borderRadius: 12,
    cursor: 'pointer',
    minWidth: 170,
    padding: '12px 18px',
    transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
  }).merge(localSlotMergeInteraction).focusVisible({
    outlineColor: '#5eead4',
  }),
  label: style.slot({
    color: 'inherit',
    fontSize: 14,
    fontWeight: 700,
  }),
};

const slotOverrideChainBase = style.raw({
  backgroundColor: '#be123c',
  boxShadow: '0 12px 28px rgba(190, 18, 60, 0.25)',
});

const slotOverrideChainTheme = style.scope([
  buttonBaseStyles.container({
    ...slotOverrideChainBase,
    color: '#ffffff',
  }).merge(localSlotMergeInteraction).focusVisible({
    outlineColor: '#fda4af',
  }),
]);

const debugRowText = {
  card: style({
    width: '100%',
  }),
  groups: style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 18,
  }),
  testGrid: style({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 18,
    width: '100%',
  }),
  stack: style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    textAlign: 'left',
    lineHeight: 1.25,
  }),
  title: style({
    fontSize: 14,
    fontWeight: 800,
  }),
  detail: style({
    fontSize: 11,
    fontWeight: 650,
    opacity: 0.8,
  }),
  code: style({
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  }),
};

const pulseIn = createKeyframes({
  '0%': {
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  },
  '10%': {
    opacity: 0.35,
    transform: 'translateY(10px) scale(0.98)',
  },
  '31%': {
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  },
  '100%': {
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
  animationDuration: '2900ms',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

export function Page(props: PageProps) {
  const css = combineStyle(pageStyles, pageTheme(pageStyles.container));
  const slotChainCss = combineStyle(slotChainStyles);

  return (
    <main css={[appTheme, css.container, props.css]}>
      <div css={css.panel}>
        <p css={css.eyebrow}>Basic example</p>
        <h1 css={css.title}>Style primitives, rendered cleanly.</h1>
        <p css={css.description}>
          A small demo of tokens, slots, scoped themes, and state styles working together in a React view.
        </p>
        <div css={keyframeBadge}>Keyframes are wired</div>
        <div css={debugRowText.groups}>
          <div css={css.actions}>
            <Button>Save</Button>
          </div>
          <div css={debugRowText.testGrid}>
            <Button css={debugRowText.card} debugTarget='scope-merge' theme={mergedCancelButtonTheme}>
              <span css={debugRowText.stack}>
                <span css={debugRowText.title}>Scope merge</span>
                <span css={debugRowText.detail}>
                  self: <span css={debugRowText.code}>outline</span>
                </span>
                <span css={debugRowText.detail}>
                  .merge: <span css={debugRowText.code}>box-shadow</span>
                </span>
              </span>
            </Button>
            <Button css={[mergedButtonStyle, debugRowText.card]} debugTarget='style-merge'>
              <span css={debugRowText.stack}>
                <span css={debugRowText.title}>Style merge</span>
                <span css={debugRowText.detail}>
                  self: <span css={debugRowText.code}>background-color</span>
                </span>
                <span css={debugRowText.detail}>
                  ...spread: <span css={debugRowText.code}>box-shadow</span>
                </span>
                <span css={debugRowText.detail}>
                  .merge: <span css={debugRowText.code}>transition</span>
                </span>
              </span>
            </Button>
            <button css={[slotChainCss.container, debugRowText.card]} data-debug-target='slot-chain-merge'>
              <span css={[slotChainCss.label, debugRowText.stack]}>
                <span css={debugRowText.title}>Slot chain merge</span>
                <span css={debugRowText.detail}>
                  self: <span css={debugRowText.code}>color</span>
                </span>
                <span css={debugRowText.detail}>
                  ...spread: <span css={debugRowText.code}>background-color</span>
                </span>
                <span css={debugRowText.detail}>
                  .merge: <span css={debugRowText.code}>outline</span>
                </span>
              </span>
            </button>
            <Button css={debugRowText.card} debugTarget='slot-override-chain-merge' theme={slotOverrideChainTheme}>
              <span css={debugRowText.stack}>
                <span css={debugRowText.title}>Slot override merge</span>
                <span css={debugRowText.detail}>
                  self: <span css={debugRowText.code}>color</span>
                </span>
                <span css={debugRowText.detail}>
                  ...spread: <span css={debugRowText.code}>background-color</span>
                </span>
                <span css={debugRowText.detail}>
                  .merge: <span css={debugRowText.code}>outline</span>
                </span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
