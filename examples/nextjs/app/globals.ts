import { style } from '@fluentic/style';
import { createGlobalSheet } from '@fluentic/style/css';

// Global selectors reach the client through the RSC dev payload and become CSS in production.
createGlobalSheet({ layer: 'reset', order: -1 }, [
  style.selector('*', { boxSizing: 'border-box' }),
  style.selector('html', {
    background: 'linear-gradient(180deg, rgba(247, 245, 239, 0.96), rgba(244, 241, 233, 1)), #f7f5ef',
    color: '#1c1d20',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    textRendering: 'optimizeLegibility',
  }),
  style.selector('body', {
    margin: 0,
    minHeight: '100vh',
    WebkitFontSmoothing: 'antialiased',
  }),
  style.selector('a', { color: 'inherit' }),
]);
