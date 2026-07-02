import { style } from '@fluentic/style';
import { sharedPanelBase, sharedTextBase } from './shared';
import { colorTokens, pageTypography, palette, radius, size, spacing } from './tokens';

const pageContainerTokens = style.raw({
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: spacing.contentGap,
  minHeight: '100vh',
  padding: spacing.container,
});

const pageTitleTokens = style.plain({
  fontSize: pageTypography.titleSize,
  fontWeight: pageTypography.titleWeight,
  letterSpacing: '-0.03em',
  lineHeight: '1',
  margin: 0,
});

const actionRowBase = style.raw({
  display: 'flex',
  flexWrap: 'wrap',
});

export const pageStyles = {
  container: style.slot({
    ...sharedTextBase,
    ...pageContainerTokens,
    boxSizing: 'border-box',
    backgroundColor: colorTokens.background,
    color: colorTokens.text,
  }).media('(max-width: 700px)', {
    padding: spacing.containerSmall,
  }),
  panel: style.slot({
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.contentGap,
    maxWidth: size.pageWidth,
    width: '100%',
    padding: spacing.container,
    backgroundColor: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: radius.page,
    boxShadow: palette.shadow,
  }),
  eyebrow: style.slot({
    ...sharedTextBase,
    alignSelf: 'flex-start',
    margin: 0,
    padding: '6px 10px',
    color: palette.accent,
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    fontSize: pageTypography.eyebrowSize,
    fontWeight: pageTypography.labelWeight,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  }),
  title: style.slot({
    ...sharedTextBase,
    ...pageTitleTokens,
    color: colorTokens.text,
  }),
  description: style.slot({
    ...sharedTextBase,
    maxWidth: 540,
    margin: 0,
    color: palette.mutedText,
    fontSize: pageTypography.bodySize,
    fontWeight: pageTypography.bodyWeight,
  }),
  actions: style.slot({
    ...actionRowBase,
    gap: spacing.buttonGap,
  }),
};

const sharedPanel = {
  ...sharedPanelBase,
  padding: spacing.buttonPaddingX,
};

export const buttonBaseStyles = {
  container: style.slot({
    ...sharedPanel,
    color: palette.panelText,
    backgroundColor: palette.panelBackground,
    border: 0,
    borderRadius: radius.button,
    boxShadow: '0 12px 28px rgba(37, 99, 235, 0.25)',
    cursor: 'pointer',
    minWidth: size.buttonMinWidth,
    padding: `${spacing.buttonPaddingY}px ${spacing.buttonPaddingX}px`,
    transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, opacity 160ms ease',
  }),
  label: style.slot({
    ...sharedTextBase,
    fontSize: pageTypography.labelSize,
    fontWeight: pageTypography.labelWeight,
    color: 'inherit',
  }),
};

export const buttonBaseState = style.scope()
  .hover([
    buttonBaseStyles.container({
      opacity: 0.86,
    }),
  ]).active([
    buttonBaseStyles.container({
      transform: 'translateY(1px)',
    }),
  ]);

const buttonTokens = {
  backgroundColor: palette.panelBackground,
  color: palette.panelText,
};

export const buttonTheme = style
  .scope([
    buttonBaseStyles.container({
      ...buttonTokens,
    }),
    buttonBaseStyles.label({
      fontWeight: 600,
    }),
  ]);

export const primaryButtonTheme = style.scope([
  buttonBaseStyles.container({
    backgroundColor: palette.accentHover,
    color: palette.accentText,
  }),
  buttonBaseStyles.label({
    letterSpacing: 0,
  }),
]);

export const pageTheme = style.scope([
  buttonBaseStyles.container({
    backgroundColor: palette.accent,
    color: palette.accentText,
  }),
]).media('(max-width: 700px)', [
  pageStyles.panel({
    padding: spacing.containerSmall,
    borderRadius: 18,
  }),
  pageStyles.title({
    fontSize: 36,
  }),
  buttonBaseStyles.container({
    minWidth: 0,
  }),
]);

export const primaryButtonHoverTheme = style.scope()
  .hover([
    buttonBaseStyles.container({
      backgroundColor: palette.accent,
      color: palette.text,
    }),
    buttonBaseStyles.label({
      letterSpacing: 0,
    }),
  ]);
