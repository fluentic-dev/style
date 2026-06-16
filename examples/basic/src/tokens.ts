import { createTheme, createToken } from '@fluentic/style';

export const palette = {
  background: '#f7f8fc',
  surface: '#ffffff',
  text: '#111827',
  mutedText: '#6b7280',
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentText: '#ffffff',
  panelBackground: '#111827',
  panelText: '#ffffff',
  border: '#e5e7eb',
  shadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
};

export const colorTokens = {
  background: createToken(palette.background),
  text: createToken(palette.text),
};

export const appTheme = createTheme([
  colorTokens.background(palette.background),
  colorTokens.text(palette.text),
], 'basic-app-theme');

export const spacing = {
  container: 52,
  containerSmall: 20,
  contentGap: 28,
  buttonGap: 12,
  buttonPaddingX: 20,
  buttonPaddingY: 12,
};

export const pageTypography = {
  titleSize: 48,
  titleWeight: 800,
  eyebrowSize: 13,
  bodySize: 16,
  bodyWeight: 500,
  labelSize: 15,
  labelWeight: 700,
};

export const radius = {
  page: 24,
  button: 12,
};

export const size = {
  pageWidth: 760,
  buttonMinWidth: 112,
};
