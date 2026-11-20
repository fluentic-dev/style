import { style } from '@fluentic/style';
import { createGlobalSheet } from '@fluentic/style/css';

// Imported once by the client entry. No class or css prop is attached to the DOM.
// Development injects these rules immediately; production extracts them to CSS.
createGlobalSheet({ layer: 'reset', order: -1 }, [
  style.selector('*', { boxSizing: 'border-box' }),
  style.selector(['html', 'body', '#root'], { minHeight: '100%' }),
  style.selector('body', {
    margin: 0,
    background: '#f6f7fb',
    color: '#111827',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }),
  style.selector(['button', 'input'], { font: 'inherit' }),
]);

// Development injects on click. The production plugin extracts this CSS at build time,
// so headings are underlined on initial load even before this function is invoked.
export function highlightGlobalHeadings() {
  createGlobalSheet({ order: 1 }, [
    style.selector('[data-global-heading]', {
      textDecorationLine: 'underline',
      textDecorationColor: '#8b5cf6',
      textDecorationThickness: '3px',
      textUnderlineOffset: '6px',
    }),
  ]);
}
