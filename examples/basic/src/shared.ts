import { palette } from './tokens';

export const sharedTextBase = {
  fontSize: 16,
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  lineHeight: '1.5',
} as const;

export const sharedPanelBase = {
  backgroundColor: palette.panelBackground,
  color: palette.panelText,
  borderRadius: 12,
} as const;
