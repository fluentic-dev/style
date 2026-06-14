export const benchmarkApps = [
  {
    name: 'fluentic-style-extract-chain',
    filter: '@benchmark/app-fluentic-style',
    buildScript: 'build:extract',
    distDir: 'dist-extract',
    port: 5401,
    extraQuery: '&fluenticMode=chain',
    styleContract: { maxStyleTags: 0, fluenticRuntimeTags: 0 },
  },
  {
    name: 'fluentic-style-extract-chain-no-hoist',
    filter: '@benchmark/app-fluentic-style',
    buildScript: 'build:extract:no-hoist',
    distDir: 'dist-extract-no-hoist',
    port: 5412,
    extraQuery: '&fluenticMode=chain',
    lane: 'static-dashboard-no-hoist',
    styleContract: { maxStyleTags: 0, fluenticRuntimeTags: 0 },
  },
  {
    name: 'fluentic-style-inline-chain-hoist',
    filter: '@benchmark/app-fluentic-style',
    buildScript: 'build:extract',
    distDir: 'dist-extract',
    port: 5413,
    extraQuery: '&fluenticMode=chain&inlineStyle=1',
    lane: 'inline-extracted-dashboard',
    styleContract: { maxStyleTags: 0, fluenticRuntimeTags: 0 },
  },
  {
    name: 'fluentic-style-inline-chain-no-hoist',
    filter: '@benchmark/app-fluentic-style',
    buildScript: 'build:extract:no-hoist',
    distDir: 'dist-extract-no-hoist',
    port: 5414,
    extraQuery: '&fluenticMode=chain&inlineStyle=1',
    lane: 'inline-extracted-dashboard',
    styleContract: { maxStyleTags: 0, fluenticRuntimeTags: 0 },
  },
  {
    name: 'fluentic-style-inline-chain-hoist-stress',
    filter: '@benchmark/app-fluentic-style',
    buildScript: 'build:extract',
    distDir: 'dist-extract',
    port: 5415,
    extraQuery: '&fluenticMode=chain&inlineStyle=1&stressStyle=1',
    lane: 'inline-dynamic-style-stress',
    styleContract: { maxStyleTags: 0, fluenticRuntimeTags: 0 },
  },
  {
    name: 'fluentic-style-inline-chain-no-hoist-stress',
    filter: '@benchmark/app-fluentic-style',
    buildScript: 'build:extract:no-hoist',
    distDir: 'dist-extract-no-hoist',
    port: 5416,
    extraQuery: '&fluenticMode=chain&inlineStyle=1&stressStyle=1',
    lane: 'inline-dynamic-style-stress',
    styleContract: { maxStyleTags: 0, fluenticRuntimeTags: 0 },
  },
  {
    name: 'fluentic-style-extract-simple',
    filter: '@benchmark/app-fluentic-style',
    buildScript: 'build:extract',
    distDir: 'dist-extract',
    port: 5402,
    extraQuery: '&fluenticMode=simple',
    styleContract: { maxStyleTags: 0, fluenticRuntimeTags: 0 },
  },
  {
    name: 'fluentic-runtime-css-prop',
    filter: '@benchmark/app-fluentic-runtime',
    port: 5403,
    extraQuery: '',
    lane: 'runtime-css-prop',
    styleContract: { minFluenticRuntimeTags: 2 },
  },
  {
    name: 'fluentic-runtime-css-prop-stress',
    filter: '@benchmark/app-fluentic-runtime',
    port: 5417,
    extraQuery: '&stressStyle=1',
    lane: 'inline-dynamic-style-stress',
    styleContract: { minFluenticRuntimeTags: 2 },
  },
  { name: 'emotion', filter: '@benchmark/app-emotion', port: 5405, extraQuery: '' },
  {
    name: 'emotion-stress',
    filter: '@benchmark/app-emotion',
    port: 5418,
    extraQuery: '&stressStyle=1',
    lane: 'inline-dynamic-style-stress',
  },
  {
    name: 'styled-components',
    filter: '@benchmark/app-styled-components',
    port: 5406,
    extraQuery: '',
  },
  {
    name: 'styled-components-stress',
    filter: '@benchmark/app-styled-components',
    port: 5419,
    extraQuery: '&stressStyle=1',
    lane: 'inline-dynamic-style-stress',
  },
  { name: 'goober', filter: '@benchmark/app-goober', port: 5407, extraQuery: '' },
  {
    name: 'goober-stress',
    filter: '@benchmark/app-goober',
    port: 5420,
    extraQuery: '&stressStyle=1',
    lane: 'inline-dynamic-style-stress',
  },
  { name: 'stylex', filter: '@benchmark/app-stylex', port: 5408, extraQuery: '', styleContract: { maxStyleTags: 0 } },
  {
    name: 'panda-static-css',
    filter: '@benchmark/app-panda',
    port: 5409,
    extraQuery: '',
    experimental: true,
    styleContract: { maxStyleTags: 0 },
  },
  {
    name: 'vanilla-extract',
    filter: '@benchmark/app-vanilla-extract',
    port: 5410,
    extraQuery: '',
    styleContract: { maxStyleTags: 0 },
  },
  {
    name: 'css-modules',
    filter: '@benchmark/app-css-modules',
    port: 5411,
    extraQuery: '',
    styleContract: { maxStyleTags: 0 },
  },
];

export const correctnessContract = {
  name: 'simple-dashboard-contract',
  description: [
    'All libraries must render the same dashboard semantics with idiomatic static styles.',
    'Dynamic arbitrary style creation is not part of this contract and belongs in a separate stress benchmark.',
    'Performance numbers are only valid when the computed-style assertions pass.',
    'Median should be treated as the primary timing metric; mean and p95 are retained for outlier visibility.',
  ],
  benchmarkSources: [
    {
      library: 'Emotion',
      practice:
        'React css-prop usage with hoisted object styles; cold first run and post-warmup render metrics are reported separately.',
      url: 'https://emotion.sh/docs/best-practices',
    },
    {
      library: 'styled-components',
      practice:
        'Template/object styled components are rendered in production builds with dynamic-prop scenarios isolated from static class scenarios.',
      url: 'https://styled-components.com/docs/advanced',
    },
    {
      library: 'StyleX',
      practice:
        'Static atomic extraction is compared as a zero-runtime/static CSS category rather than fresh runtime insertion.',
      url: 'https://stylexjs.com/docs/learn/styling-ui/defining-styles/',
    },
    {
      library: 'vanilla-extract',
      practice: 'Extracted CSS is compared with static class composition and bundle/CSS output metrics.',
      url: 'https://vanilla-extract.style/documentation/getting-started/',
    },
    {
      library: 'Panda CSS',
      practice:
        'Generated static utility CSS is imported explicitly; the generated css() helper is treated as a lightweight class-name runtime.',
      url: 'https://panda-css.com/docs/concepts/styled-system',
    },
  ],
  query: 'verify=1&rows=20',
  detailsQuery: 'verify=1&view=details&liteStyle=0&rows=20',
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 760, height: 900 },
  ],
  assertions: [
    {
      name: 'page base styles',
      selector: 'body > div > div',
      computed: {
        backgroundColor: 'rgb(15, 23, 42)',
        color: 'rgb(229, 231, 235)',
        fontFamilyIncludes: 'system',
        minHeight: '900px',
      },
    },
    {
      name: 'header layout and surface',
      selector: 'header',
      computed: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgb(11, 18, 32)',
        borderTopColor: 'rgb(51, 65, 85)',
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
      },
    },
    {
      name: 'dashboard shell layout',
      selector: 'header + div',
      computed: {
        display: 'grid',
        gridTemplateColumnsIncludes: '250px',
      },
    },
    {
      name: 'menu button hover cascade',
      selector: 'button',
      hover: true,
      computed: {
        borderTopColor: 'rgb(34, 211, 238)',
      },
    },
    {
      name: 'muted text hover cascade',
      selector: 'p',
      hover: true,
      computed: {
        color: 'rgb(203, 213, 225)',
      },
    },
    {
      name: 'responsive title size',
      selector: 'h1',
      viewport: 'mobile',
      computed: {
        fontSize: '18px',
      },
    },
    {
      name: 'active row background',
      selector: 'tbody tr:nth-child(2)',
      computed: {
        backgroundColor: 'rgba(34, 211, 238, 0.08)',
      },
    },
    {
      name: 'badge shape',
      selector: 'tbody tr:nth-child(1) span',
      computed: {
        display: 'inline-block',
        borderTopColor: 'rgb(51, 65, 85)',
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
      },
    },
  ],
  structureAssertions: [
    { name: 'dashboard title', selector: 'h1', text: 'Admin Dashboard' },
    { name: 'menu item count', selector: 'section:first-of-type button', count: 6 },
    { name: 'customer row count', selector: 'tbody tr', count: 20 },
    { name: 'table header count', selector: 'thead th', count: 4 },
    { name: 'first customer name', selector: 'tbody tr:first-child td:first-child', text: 'Customer 1' },
    { name: 'second active row is rendered', selector: 'tbody tr:nth-child(2)', count: 1 },
  ],
  detailsAssertions: [
    { name: 'details title', selector: 'h1', text: 'Customer Detail' },
    { name: 'details route copy', selector: 'p', text: 'Real route view mount simulation.' },
    { name: 'details table omitted', selector: 'table', count: 0 },
  ],
};

export function selectBenchmarkApps() {
  return getBenchmarkSelection().apps;
}

export function getBenchmarkSelection() {
  const skipFluenticStyle = process.env.SKIP_FLUENTIC_STYLE === '1';
  const includeExperimental = process.env.INCLUDE_EXPERIMENTAL === '1';
  const selectedApps = (process.env.APP || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const apps = [];
  const skipped = [];

  for (const app of benchmarkApps) {
    let reason = '';

    if (skipFluenticStyle && app.name.startsWith('fluentic-')) {
      reason = 'SKIP_FLUENTIC_STYLE=1';
    } else if (!includeExperimental && app.experimental) {
      reason = 'experimental app excluded; set INCLUDE_EXPERIMENTAL=1';
    } else if (
      selectedApps.length &&
      !selectedApps.includes(app.name) &&
      !selectedApps.includes(app.filter)
    ) {
      reason = `not selected by APP=${selectedApps.join(',')}`;
    }

    if (reason) {
      skipped.push({ name: app.name, filter: app.filter, reason });
    } else {
      apps.push(app);
    }
  }

  return { apps, skipped };
}

export function getBuildKey(app) {
  return [app.filter, app.buildScript || 'build', app.distDir || 'dist'].join('\0');
}

export function getUniqueBuildApps(apps) {
  const seen = new Set();
  const uniqueApps = [];

  for (const app of apps) {
    const key = getBuildKey(app);

    if (seen.has(key)) continue;
    seen.add(key);
    uniqueApps.push(app);
  }

  return uniqueApps;
}
