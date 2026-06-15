import { bindScope, combineStyle } from '@fluentic/style';
import { Chrome } from '../../lib/Chrome';
import { getNextThemeById, nextThemes, themeExampleStyles, themePanelScope, themeTokens } from '../../lib/theme';
import { ThemeClientPanel } from './ThemeClientPanel';

export default async function ThemePage(props: {
  searchParams: Promise<{ serverTheme?: string | string[]; }>;
}) {
  const searchParams = await props.searchParams;
  const css = combineStyle(
    themeExampleStyles,
    themeTokens.color.warning('#92400e'),
    themeTokens.color.warningSoft('#fef3c7'),
    bindScope(themeExampleStyles.panel, themePanelScope),
  );

  const serverTheme = getNextThemeById(searchParams.serverTheme);

  return (
    <Chrome>
      <section css={[serverTheme.theme, css.shell]}>
        <div css={css.hero}>
          <span css={css.eyebrow}>Theme fixture</span>
          <h1 css={css.title}>Next.js theme coverage</h1>
          <p css={css.intro}>
            Server components, client state, scoped rules, token overrides, media queries, and hover styles all share
            this route so the RSC payload and observer can be checked together.
          </p>
        </div>

        <section css={css.board}>
          <article css={css.panel}>
            <h2 css={css.panelTitle}>server theme seed</h2>
            <p css={css.panelText}>
              The root section receives a createTheme class during server render. These links navigate through RSC so
              the serialized seed theme changes before the client observer takes over.
            </p>
            <div css={css.switcher} aria-label='Server theme choices'>
              {nextThemes.map((item) => (
                <a
                  key={item.id}
                  css={[css.button, item.id === serverTheme.id && css.activeButton]}
                  href={`/theme?serverTheme=${item.id}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div css={css.metricGrid}>
              <div css={css.metric}>
                <span css={css.metricLabel}>theme</span>
                <strong css={css.metricValue}>{serverTheme.label}</strong>
              </div>
              <div css={css.metric}>
                <span css={css.metricLabel}>scope</span>
                <strong css={css.metricValue}>hover</strong>
              </div>
              <div css={css.metric}>
                <span css={css.metricLabel}>tokens</span>
                <strong css={css.metricValue}>vars</strong>
              </div>
            </div>
            <span css={css.warning}>server override token</span>
          </article>

          <ThemeClientPanel />
        </section>
      </section>
    </Chrome>
  );
}
