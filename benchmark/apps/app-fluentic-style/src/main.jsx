import { base, getRowVars, menu, mountSingleBench, palette, rows } from '@benchmark/main';
import { bindScope, combineStyle, createToken, style } from '@fluentic/style';

const params = new URLSearchParams(window.location.search);
const fluenticMode = params.get('fluenticMode') || 'direct';
const useInlineStyle = params.get('inlineStyle') === '1';
const useStressStyle = params.get('stressStyle') === '1';

const accentToken = createToken(palette.accent, 'bench-accent');
const surfaceToken = createToken(palette.panel, 'bench-surface');
const ringToken = createToken('rgba(34,211,238,0.20)', 'bench-ring');

const appStyles = {
  page: style.slot(base.page),
  header: style.slot(base.header),
  shell: style.slot(base.shell),
  card: style.slot(base.card),
  detailsHero: style.slot(base.detailsHero),
  select: style.slot(base.select),
  title: style.slot(base.title).media('(max-width: 900px)', { fontSize: 18 }),
  muted: style.slot(base.muted).hover({ color: '#cbd5e1' }),
  menuBtn: style.slot(base.menuBtn).hover({ borderColor: palette.accent }),
  table: style.slot(base.table),
  thtd: style.slot(base.thtd),
  row: style.slot({}),
  rowActive: style.slot({ background: 'rgba(34,211,238,0.08)' }),
  badge: style.slot(base.badge),
};

const scopedStyles = {
  ...appStyles,
  card: style.slot(base.card).media('(max-width: 900px)', { padding: 10 }),
  row: style.slot({
    background: surfaceToken,
    boxShadow: `inset 3px 0 0 ${ringToken}`,
  }),
  badge: style.slot({
    ...base.badge,
    color: accentToken,
  }),
};

const compactScope = style.scope([
  scopedStyles.card({ padding: 10 }),
  scopedStyles.menuBtn({ minHeight: 34 }),
]);
const activeScope = style.scope([
  scopedStyles.row({ background: 'rgba(34,211,238,0.08)' }),
  scopedStyles.badge({ fontWeight: 700 }),
]);
const successScope = style.scope([
  scopedStyles.badge({ color: '#0f766e' }),
]);
const trialScope = style.scope([
  scopedStyles.badge({ color: '#b45309' }),
]);
const blockedScope = style.scope([
  scopedStyles.badge({ color: '#dc2626' }),
]);

function getStatusScope(row) {
  if (row.status === 'blocked') return blockedScope;
  if (row.status === 'trial') return trialScope;
  return successScope;
}

function getAccent(row) {
  if (row.status === 'blocked') return '#dc2626';
  if (row.status === 'trial') return '#b45309';
  return '#0f766e';
}

function getSurface(row) {
  if (row.status === 'blocked') return 'rgba(254,242,242,0.92)';
  if (row.status === 'trial') return 'rgba(255,251,235,0.92)';
  return 'rgba(240,253,250,0.92)';
}

function getRing(row) {
  if (row.status === 'blocked') return 'rgba(220,38,38,0.22)';
  if (row.status === 'trial') return 'rgba(180,83,9,0.22)';
  return 'rgba(15,118,110,0.24)';
}

function AppLayout(props) {
  if (useStressStyle) return <StressAppLayout {...props} />;
  if (useInlineStyle) return <InlineAppLayout {...props} />;
  if (fluenticMode === 'token') return <TokenAppLayout {...props} />;
  if (fluenticMode === 'scoped') return <ScopedAppLayout {...props} />;
  return <DirectAppLayout {...props} />;
}

function DirectAppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  const css = appStyles;

  if (view === 'details') {
    return (
      <div css={css.page}>
        <header css={css.header}>
          <strong>Fluentic Style Admin</strong>
          <select css={css.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={css.detailsHero}>
          <h1 css={css.title}>Customer Detail</h1>
          <p css={css.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return renderDashboard({
    css,
    getRowCss: (_row, index) => [css.row, liteStyle && index === activeRow && css.rowActive],
    getBadgeCss: () => css.badge,
    tick,
  });
}

function ScopedAppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  const css = combineStyle(
    scopedStyles,
    bindScope(scopedStyles.card, compactScope),
  );

  if (view === 'details') {
    return (
      <div css={css.page}>
        <header css={css.header}>
          <strong>Fluentic Style Admin</strong>
          <select css={css.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={css.detailsHero}>
          <h1 css={css.title}>Customer Detail</h1>
          <p css={css.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return renderDashboard({
    css,
    getRowCss: (row, index) => {
      const rowCss = combineStyle(
        scopedStyles,
        bindScope(scopedStyles.row, getStatusScope(row), liteStyle && index === activeRow && activeScope),
      );
      return rowCss.row;
    },
    getBadgeCss: (row, index) => {
      const badgeCss = combineStyle(
        scopedStyles,
        bindScope(scopedStyles.badge, getStatusScope(row), liteStyle && index === activeRow && activeScope),
      );
      return badgeCss.badge;
    },
    tick,
  });
}

function TokenAppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  const css = scopedStyles;

  if (view === 'details') {
    return (
      <div css={css.page}>
        <header css={css.header}>
          <strong>Fluentic Style Admin</strong>
          <select css={css.select}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={css.detailsHero}>
          <h1 css={css.title}>Customer Detail</h1>
          <p css={css.muted}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  return renderDashboard({
    css,
    getRowCss: (row, index) => {
      const rowCss = combineStyle(
        scopedStyles,
        bindScope(scopedStyles.row, liteStyle && index === activeRow && activeScope),
        accentToken(getAccent(row)),
        surfaceToken(getSurface(row)),
        ringToken(getRing(row)),
      );
      return rowCss.row;
    },
    getBadgeCss: (row) => {
      const badgeCss = combineStyle(scopedStyles, accentToken(getAccent(row)));
      return badgeCss.badge;
    },
    tick,
  });
}

function renderDashboard({ css, getRowCss, getBadgeCss, tick }) {
  return (
    <div css={css.page}>
      <header css={css.header}>
        <strong>Fluentic Style Admin</strong>
        <select css={css.select}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={css.shell}>
        <section css={css.card}>
          {menu.map((item) => <button key={item} css={css.menuBtn}>{item}</button>)}
        </section>
        <section css={css.card}>
          <h1 css={css.title}>Admin Dashboard</h1>
          <p css={css.muted}>Real world mount + update benchmark.</p>
          <table css={css.table}>
            <thead>
              <tr>
                <th css={css.thtd}>Name</th>
                <th css={css.thtd}>Plan</th>
                <th css={css.thtd}>Usage</th>
                <th css={css.thtd}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} css={getRowCss(row, index)} style={getRowVars(row, tick)}>
                  <td css={css.thtd}>{row.name}</td>
                  <td css={css.thtd}>{row.plan}</td>
                  <td css={css.thtd}>{row.usage}%</td>
                  <td css={css.thtd}>
                    <span css={getBadgeCss(row, index)}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function InlineAppLayout({ view, tick, liteStyle }) {
  const activeRow = tick % rows.length;
  const accent = tick % 2 === 0 ? palette.accent : '#a78bfa';
  const surface = tick % 3 === 0 ? '#0d1727' : '#111827';
  const compactPadding = 10 + (tick % 3);
  const pageCss = style(base.page);
  const headerCss = style({
    ...base.header,
    borderBottom: `1px solid ${accent}`,
  });
  const selectCss = style(base.select);
  const panelTitleCss = style({
    ...base.title,
    color: accent,
  }).media('(max-width: 900px)', { fontSize: 18 });
  const panelDescCss = style(base.muted).hover({ color: accent });

  if (view === 'details') {
    return (
      <div css={pageCss}>
        <header css={headerCss}>
          <strong>Fluentic Style Admin</strong>
          <select css={selectCss}>
            <option>Last 7 days</option>
          </select>
        </header>
        <section css={style(base.detailsHero)}>
          <h1 css={panelTitleCss}>Customer Detail</h1>
          <p css={panelDescCss}>Real route view mount simulation.</p>
        </section>
      </div>
    );
  }

  const panelCss = style(base.card)
    .media('(max-width: 900px)', { padding: compactPadding })
    .media('(min-width: 700px)', { background: surface });

  return (
    <div css={pageCss}>
      <header css={headerCss}>
        <strong>Fluentic Style Admin</strong>
        <select css={selectCss}>
          <option>Last 7 days</option>
        </select>
      </header>
      <div css={style(base.shell)}>
        <section css={style(base.card)}>
          {menu.map((item, index) => (
            <button
              key={item}
              css={style({
                ...base.menuBtn,
                borderColor: index === tick % menu.length ? accent : '#1e293b',
              }).hover({ borderColor: accent })}
            >
              {item}
            </button>
          ))}
        </section>
        <section css={panelCss}>
          <h1 css={panelTitleCss}>Admin Dashboard</h1>
          <p css={panelDescCss}>Real world mount + update benchmark.</p>
          <table css={style(base.table)}>
            <thead>
              <tr>
                <th css={style(base.thtd)}>Name</th>
                <th css={style(base.thtd)}>Plan</th>
                <th css={style(base.thtd)}>Usage</th>
                <th css={style(base.thtd)}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  css={liteStyle && index === activeRow
                    ? style({ background: `color-mix(in srgb, ${accent} 14%, transparent)` })
                    : null}
                >
                  <td css={style(base.thtd)}>{row.name}</td>
                  <td css={style(base.thtd)}>{row.plan}</td>
                  <td css={style(base.thtd)}>{row.usage}%</td>
                  <td css={style(base.thtd)}>
                    <span
                      css={style({
                        ...base.badge,
                        borderColor: row.usage > 70 ? accent : '#334155',
                      })}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function StressAppLayout({ view, tick, liteStyle }) {
  return <InlineAppLayout view={view} tick={tick} liteStyle={liteStyle} />;
}

mountSingleBench({ AppLayout, lib: `fluentic-style-${fluenticMode}` });
