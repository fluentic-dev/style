'use client';

import { bindScope, combineStyle } from '@fluentic/style';
import { useState } from 'react';
import { nextThemes, themeExampleStyles, themePanelScope } from '../../lib/theme';

export function ThemeClientPanel() {
  const css = combineStyle(themeExampleStyles, bindScope(themeExampleStyles.panel, themePanelScope));
  const [themeIndex, setThemeIndex] = useState(1);
  const activeTheme = nextThemes[themeIndex];

  return (
    <article css={[activeTheme.theme, css.panel]}>
      <h2 css={css.panelTitle}>client theme switch</h2>
      <p css={css.panelText}>
        This client component swaps createTheme output after hydration. The observer should insert the theme rule and
        reuse the same dev sheet as normal runtime styles.
      </p>
      <div css={css.switcher} aria-label='Client theme choices'>
        {nextThemes.map((item, index) => (
          <button
            key={item.label}
            css={[css.button, index === themeIndex && css.activeButton]}
            type='button'
            onClick={() => setThemeIndex(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span css={css.warning}>{activeTheme.label} active</span>
    </article>
  );
}
