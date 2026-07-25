import { useState } from 'react';
import { pageStyles } from './App.style';
import { teamOptions, workspaceOptions } from './options';
import { Select } from './Select';
import { selectThemes } from './themes';

export const App = () => {
  const [themeIndex, setThemeIndex] = useState(0);
  const selectedTheme = selectThemes[themeIndex];

  return (
    <main css={[selectedTheme.sheet, pageStyles.shell]}>
      <div css={pageStyles.content}>
        <section css={pageStyles.intro}>
          <p css={pageStyles.eyebrow}>third-party selectors</p>
          <h1 css={pageStyles.title}>Attachable selector sheets for fixed third-party class names.</h1>
          <p css={pageStyles.copy}>
            React Select owns the internal markup and generated prefix classes. Fluentic owns the styling by attaching
            selector sheets to the wrapper and to portal targets mounted under document.body.
          </p>
          <div css={pageStyles.themeReadout}>
            <span css={pageStyles.themeReadoutDot} />
            <span>
              The selected theme is a token-only sheet. The control sheet reads those tokens locally, and the menu sheet
              can read the same tokens from either the wrapper or an explicit portal target.
            </span>
          </div>
          <div css={pageStyles.themeSwitcher}>
            {selectThemes.map((theme, index) => {
              const isActive = index === themeIndex;

              return (
                <button
                  key={theme.name}
                  css={[pageStyles.themeButton, isActive && pageStyles.themeButtonActive]}
                  onClick={() => setThemeIndex(index)}
                  type='button'
                >
                  <span css={[pageStyles.themeSwatch, theme.swatch]} />
                  {theme.label}
                </button>
              );
            })}
          </div>
        </section>

        <section css={pageStyles.board}>
          <div css={pageStyles.panel}>
            <div css={pageStyles.panelHeader}>
              <div>
                <h2 css={pageStyles.panelTitle}>Component attached</h2>
                <p css={pageStyles.panelNote}>
                  The attached sheet styles React Select control, value, and indicator classes with local tokens.
                </p>
              </div>
              <span css={pageStyles.badge}>{selectedTheme.label} sheet</span>
            </div>
            <Select
              defaultValue={workspaceOptions[0]}
              options={workspaceOptions}
              placeholder='Choose a workspace'
              theme={selectedTheme.sheet}
            />
          </div>

          <div css={pageStyles.panel}>
            <div css={pageStyles.panelHeader}>
              <div>
                <h2 css={pageStyles.panelTitle}>Same component, different sheet</h2>
                <p css={pageStyles.panelNote}>
                  The compact sheet reuses the same selector contract, then overrides size, radius, and spacing.
                </p>
              </div>
              <span css={pageStyles.badge}>base + compact</span>
            </div>
            <Select
              compact
              defaultValue={teamOptions[1]}
              options={teamOptions}
              placeholder='Choose a team'
              theme={selectedTheme.sheet}
            />
          </div>

          <div css={pageStyles.panel}>
            <div css={pageStyles.panelHeader}>
              <div>
                <h2 css={pageStyles.panelTitle}>Portal dropdown</h2>
                <p css={pageStyles.panelNote}>
                  Open either select: React Select renders the menu outside the component, and Fluentic attaches the
                  menu sheet to that portal target.
                </p>
              </div>
              <span css={pageStyles.badge}>portal attached</span>
            </div>
            <div css={pageStyles.menuRows}>
              <div css={pageStyles.menuRow}>
                <label css={pageStyles.menuLabel}>Default select</label>
                <Select
                  css={pageStyles.menuSelect}
                  defaultValue={workspaceOptions[1]}
                  options={workspaceOptions}
                  portal
                  theme={selectedTheme.sheet}
                />
              </div>
              <div css={pageStyles.menuRow}>
                <label css={pageStyles.menuLabel}>Compact select</label>
                <Select
                  compact
                  css={pageStyles.menuSelect}
                  defaultValue={teamOptions[2]}
                  options={teamOptions}
                  portal
                  theme={selectedTheme.sheet}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
