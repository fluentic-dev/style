import {
  before,
  bindScope,
  BUILDER_TYPE_SCOPE,
  clearRscStyleStore,
  combineStyle,
  configureRuntime,
  createCombinedStylePool,
  createDevSheet,
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedToken,
  createFakeDocument,
  createTheme,
  createThemeRule,
  createToken,
  createTokens,
  type DebugData,
  ELEMENT_CSS_DATA_ATTR,
  equal,
  getClassName,
  getCombinedStyleScopes,
  getGlobalSheet,
  getLayerNameForRule,
  getRscStyleCss,
  getToken,
  hoverTheme,
  includes,
  notEqual,
  notIncludes,
  resolveStyleProp,
  setBuildMeta,
  setGlobalSheet,
  style,
  styles,
  test,
  theme,
  transformElement,
  transformRscElement,
  withTokens,
} from './setup';

test('pool prepends inherited scopes before own scopes', () => {
  const pool = createCombinedStylePool();
  const parent = pool.get(styles, [], [theme(styles.container)]).style;
  const child = pool.get(styles, getCombinedStyleScopes(parent), [hoverTheme(styles.container)]).style;

  equal((child.label as any).items.length, 3);
});

test('bindScope keeps recursive scope order', () => {
  const targets = bindScope(styles.container, [
    theme,
    false,
    [hoverTheme],
  ]);

  equal(targets.length, 2);
});

test('extracted scope parent selector applies target and child classes', () => {
  const extractedCard = createExtractedSlot('extracted-card', [
    ['card-padding', 'card-padding-class'],
  ]);
  const extractedButton = createExtractedSlot('extracted-button', [
    ['button-bg', 'button-bg-class'],
    ['button-hover-bg', 'button-hover-bg-class'],
  ]);
  const extractedScope = createExtractedScope([
    [BUILDER_TYPE_SCOPE, 'extracted-button', 'scope-button-bg', 'scope-button-bg-class', true],
  ]);
  const css = combineStyle(
    {
      card: extractedCard,
      button: extractedButton,
    },
    bindScope(extractedCard, extractedScope),
  );

  equal(
    getClassName(css.card).className,
    'card-padding-class -scope-button-bg-class',
  );
  equal(
    getClassName(css.button).className,
    'button-bg-class button-hover-bg-class scope-button-bg-class',
  );
});

test('style prop resolver dedupes resolved items', () => {
  const pool = createCombinedStylePool();
  const css = pool.get(styles, [], [theme(styles.container)]).style;
  const result = resolveStyleProp([css.container as any, css.container as any]);

  equal(result.className.split(' ').length, 1);
});

test('style prop resolver accepts direct raw style and slot data', () => {
  const directStyles = {
    container: style({
      color: 'red',
    }),
    label: style.slot({
      color: 'black',
    }),
  };

  const result = resolveStyleProp([directStyles.container, directStyles.label]);
  const cached = resolveStyleProp([directStyles.container, directStyles.label]);

  if (!result.className) throw new Error('expected direct raw css class name');
  equal(result, cached);
});

test('style prop resolver skips result cache when cache is disabled', () => {
  const directStyles = {
    container: style({
      color: 'crimson',
    }),
  };

  try {
    configureRuntime({ cache: false });

    const first = resolveStyleProp(directStyles.container);
    const second = resolveStyleProp(directStyles.container);

    equal(first.className, second.className);
    notEqual(first, second);
  } finally {
    configureRuntime({ dev: false });
  }
});

test('getClassName inserts consumed combined style runtime rules', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    const css = combineStyle(styles);
    const result = getClassName(css.container);

    if (!result.className) throw new Error('expected combined class name');

    const text = document.head.textContent;

    includes(text, 'color: red');
    notIncludes(text, 'color: black');
  } finally {
    setGlobalSheet(previousSheet);
  }
});

test('jsx style prop inserts direct raw style and slot runtime rules', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const directStyles = {
    container: style({
      color: 'maroon',
    }),
    label: style.slot({
      color: 'olive',
    }),
  };
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    const result = transformElement({
      type: 'div',
      props: {
        css: [directStyles.container, directStyles.label],
      },
    });
    const props = result.props as { className?: string; };

    if (!props.className) throw new Error('expected transformed class name');

    const text = document.head.textContent;

    includes(text, 'color: maroon');
    includes(text, 'color: olive');
  } finally {
    setGlobalSheet(previousSheet);
  }
});

test('jsx transform keeps props identity without style prop', () => {
  const props = { className: 'existing' };
  const result = transformElement({ type: 'div', props });

  if (result.props !== props) {
    throw new Error('expected props identity to be preserved');
  }
});

test('rsc jsx transform keeps props identity without style prop', () => {
  const props = { className: 'existing' };
  const result = transformRscElement({ type: 'div', props });

  if (result.props !== props) {
    throw new Error('expected props identity to be preserved');
  }
});

test('direct raw style prop keeps token defaults theme-overridable', () => {
  const token = createToken('blue', 'direct-theme-token');
  const tokenStyles = {
    container: style.slot({
      color: token,
    }),
  };
  const theme = createTheme([token('red')], 'direct-runtime-theme');
  const result = resolveStyleProp([theme, tokenStyles.container]);

  includes(result.className, theme.className);
  equal(result.style, undefined);
});

test('style prop warns for composition values in dev', () => {
  configureRuntime({ dev: true });

  const token = createToken('blue', 'unsupported-css-token');
  const warnings: unknown[][] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const result = resolveStyleProp([styles.container, token('red') as any]);

    if (!result.className) throw new Error('expected supported style prop item to resolve');
    equal(warnings.length, 1);
    includes(String(warnings[0][0]), 'Unsupported style prop value');
  } finally {
    console.warn = warn;
    configureRuntime({ dev: false });
  }
});

test('style prop resolver keeps token defaults in css variable fallback', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const pool = createCombinedStylePool();
  const css = pool.get(tokenStyles, [], []).style;
  const result = resolveStyleProp(css.container as any);

  equal(result.style, undefined);
  if (!result.className) throw new Error('expected token class name');
});

test('static combineStyle resolves dynamic token provider values', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const css = combineStyle(tokenStyles, token('red'));
  const result = resolveStyleProp(css.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'red');
});

test('static combineStyle resolves scope token provider values', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const tokenScope = style.scope([
    token('red'),
  ]);
  const css = combineStyle(tokenStyles, tokenScope(tokenStyles.container));
  const result = resolveStyleProp(css.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'red');
});

function assertScopeTokenProviderTypes() {
  const token = createToken('blue');

  style.scope([token('red')]);
  // @ts-expect-error scope accepts token overrides, not raw token declarations.
  style.scope([token]);
}

void assertScopeTokenProviderTypes;

test('static combineStyle lets direct token providers override scope token providers', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const tokenScope = style.scope([
    token('red'),
  ]);
  const css = combineStyle(tokenStyles, tokenScope(tokenStyles.container), token('green'));
  const result = resolveStyleProp(css.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'green');
});

test('static combineStyle preserves token provider order across scopes and direct args', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const firstScope = style.scope([
    token('red'),
  ]);
  const secondScope = style.scope([
    token('purple'),
  ]);
  const css = combineStyle(
    tokenStyles,
    firstScope(tokenStyles.container),
    token('green'),
    secondScope(tokenStyles.container),
  );
  const result = resolveStyleProp(css.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'purple');
});

test('static combineStyle.for carries token provider values', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const combine = combineStyle.for(tokenStyles);
  const parent = combine(token('red'));
  const child = combine(parent);
  const result = resolveStyleProp(child.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'red');
});

test('static combineStyle.for lets later token providers override carried values', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const combine = combineStyle.for(tokenStyles);
  const parent = combine(token('red'));
  const child = combine(parent, token('green'));
  const result = resolveStyleProp(child.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'green');
});

test('static getToken resolves token values to css variable fallbacks', () => {
  const base = createToken('blue', 'static-base');
  const alias = createToken(base, 'static-alias');

  equal(getToken('red'), 'red');
  equal(getToken(10), 10);
  equal(getToken(null), null);
  equal(getToken(false), false);
  equal(getToken(base), 'var(--token-static-base, blue)');
  equal(getToken(alias), 'var(--token-static-alias, var(--token-static-base, blue))');
});

test('createTokens supports nested object token groups', () => {
  const tokens = createTokens({
    color: {
      text: 'blue',
      accent: 'green',
    },
    space: {
      sm: 8,
    },
  }, 'nested');

  equal(getToken(tokens.color.text), 'var(--token-nested--color--text, blue)');
  equal(getToken(tokens.color.accent), 'var(--token-nested--color--accent, green)');
  equal(getToken(tokens.space.sm), 'var(--token-nested--space--sm, 8)');
});

test('createTokens treats nested arrays as one token value', () => {
  const tokens = createTokens({
    shadow: [0, 8, 24],
  }, 'array-leaf');
  const override = tokens.shadow([0, 10, 30]);

  equal(getToken(tokens.shadow), 'var(--token-array-leaf--shadow, 0,8,24)');
  equal(override.value.join(','), '0,10,30');
});

test('pool token data compares by token id and primitive value', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const pool = createCombinedStylePool();
  const first = pool.get(tokenStyles, [], [token('red')]);
  const second = pool.get(tokenStyles, [], [token('red')], first.tokensData);
  const third = pool.get(tokenStyles, [], [token('green')], second.tokensData);

  equal(first.isTokenDataChanged, true);
  equal(second.isTokenDataChanged, false);
  equal(first.tokensData, second.tokensData);
  equal(third.isTokenDataChanged, true);
  notEqual(second.tokensData, third.tokensData);
});

test('dynamic token providers use last value for duplicate token ids', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const css = combineStyle(tokenStyles, token('red'), token('green'));
  const result = resolveStyleProp(css.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'green');
});

test('theme style prop contributes class and token declarations stay theme-overridable', () => {
  const token = createToken('blue', 'theme-text');
  const tokenStyles = {
    container: style.slot({
      color: token,
    }),
  };
  const theme = createTheme([token('red')], 'runtime-theme');
  const css = combineStyle(tokenStyles);
  const result = resolveStyleProp([css.container as any, theme]);

  includes(result.className, theme.className);
  equal(result.style, undefined);

  const rule = createThemeRule(theme);
  includes(rule, '.' + theme.className);
  includes(rule, '--token-theme-text:red');
});

test('local token overrides beat theme class via inline variable', () => {
  const token = createToken('blue', 'theme-local');
  const tokenStyles = {
    container: style.slot({
      color: token,
    }),
  };
  const theme = createTheme([token('red')], 'runtime-theme-local');
  const css = combineStyle(tokenStyles, token('green'));
  const result = resolveStyleProp([theme, css.container as any]);

  if (!result.style) throw new Error('expected local token variable style');

  equal((result.style as Record<string, unknown>)['--token-theme-local'], 'green');
});

test('theme token aliases emit nested css variable fallbacks', () => {
  const base = createToken('blue', 'theme-base');
  const alias = createToken(base, 'theme-alias');
  const theme = createTheme([alias(base)], 'runtime-theme-alias');
  const rule = createThemeRule(theme);

  includes(rule, '--token-theme-alias:var(--token-theme-base, blue)');
});

test('runtime debug variables make tokens use property-local inline styles', () => {
  configureRuntime({ dev: true, localClassName: true, debugClassName: true });

  const token = createToken('blue');
  const debug: DebugData = {
    $$debug: true,
    loc: [4, 14],
    label: ['style.slot', '/tmp/runtime-token-local-variable.ts:4:14', 'runtime-token-local-variable.ts'],
    fields: {
      backgroundColor: [5, 5],
    },
    vars: {
      backgroundColor: '--token-local-value',
    },
    sourceUrl: '/tmp/runtime-token-local-variable.ts',
  };
  const css = style.slot({
    backgroundColor: token,
  }, debug);
  const result = resolveStyleProp(css as any);

  if (!result.style) throw new Error('expected token variable style');

  includes(String((result.style as Record<string, unknown>)['--token-local-value']), 'var(--token-');
  includes(String((result.style as Record<string, unknown>)['--token-local-value']), 'blue');
  equal(result.className.includes('background-color-'), true);
});

test('style prop resolver wires extracted dynamic variables as inline style', () => {
  const styles = {
    container: createExtractedSlot('dynamic-slot', [
      ['dynamic-dedupe', 'dynamic-class', [1, '--dynamic-value', 'purple']],
    ]),
  };
  const pool = createCombinedStylePool();
  const css = pool.get(styles, [], []).style;
  const result = resolveStyleProp(css.container as any);

  equal(result.className, 'dynamic-class');
  equal((result.style as Record<string, unknown>)['--dynamic-value'], 'purple');
});

test('style prop resolver wires token-bound extracted style variables', () => {
  const token = createExtractedToken('bound-style-token', 'blue');
  const css = withTokens(
    createExtractedStyle([
      ['bound-style-dedupe', 'bound-style-class', [1, '--bound-style-value', token]],
    ]),
    [token('red')],
  );

  try {
    setBuildMeta({ dev: false, extract: true, hoist: true, rsc: false, css: null });

    const result = resolveStyleProp(css as any);

    equal(result.className, 'bound-style-class');
    equal((result.style as Record<string, unknown>)['--bound-style-value'], 'red');
  } finally {
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  }
});

test('style prop cache keeps token-bound extracted style values dynamic', () => {
  const token = createExtractedToken('bound-style-cache-token', 'blue');
  const css = createExtractedStyle([
    ['bound-style-cache-dedupe', 'bound-style-cache-class', [1, '--bound-style-cache-value', token]],
  ]);

  try {
    setBuildMeta({ dev: false, extract: true, hoist: true, rsc: false, css: null });

    const first = resolveStyleProp(withTokens(css, [token('red')]) as any);
    const second = resolveStyleProp(withTokens(css, [token('green')]) as any);

    equal(first.className, 'bound-style-cache-class');
    equal(second.className, 'bound-style-cache-class');
    equal((first.style as Record<string, unknown>)['--bound-style-cache-value'], 'red');
    equal((second.style as Record<string, unknown>)['--bound-style-cache-value'], 'green');
  } finally {
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  }
});

test('combineStyle carries token-bound extracted scope target values', () => {
  const token = createExtractedToken('bound-scope-token', 'blue');
  const styles = {
    container: createExtractedSlot('bound-scope-slot', [
      ['bound-scope-dedupe', 'bound-scope-class', [1, '--bound-scope-value', token]],
    ]),
  };
  const scope = createExtractedScope([
    [BUILDER_TYPE_SCOPE, 'bound-scope-slot', 'bound-scope-extra-dedupe', 'bound-scope-extra-class'],
  ]);

  try {
    setBuildMeta({ dev: false, extract: true, hoist: true, rsc: false, css: null });

    const css = combineStyle(styles, withTokens(scope(styles.container), [token('red')]));
    const result = resolveStyleProp(css.container as any);

    equal(result.className, 'bound-scope-class bound-scope-extra-class');
    equal((result.style as Record<string, unknown>)['--bound-scope-value'], 'red');
  } finally {
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  }
});

test('style prop resolver resolves extracted token variable refs', () => {
  const baseToken = createToken('blue');
  const tokenRef = createToken(baseToken);
  const styles = {
    container: createExtractedSlot('token-slot', [
      ['token-dedupe', 'token-class', [1, '--token-value', tokenRef]],
    ]),
  };
  const pool = createCombinedStylePool();
  const css = pool.get(styles, [], []).style;
  const result = resolveStyleProp(css.container as any);

  equal(result.className, 'token-class');
  includes(String((result.style as Record<string, unknown>)['--token-value']), 'var(--token-');
  includes(String((result.style as Record<string, unknown>)['--token-value']), 'blue');
});

test('style prop cache invalidates on runtime config change', () => {
  const baseToken = createToken('blue');
  const tokenRef = createToken(baseToken);
  const css = createExtractedSlot('config-cache-token-slot', [
    ['config-cache-token-dedupe', 'config-cache-token-class', [1, '--token-value', tokenRef]],
  ]);

  try {
    configureRuntime({ tokenVarPrefix: 'first-token-' });

    const first = resolveStyleProp(css as any);

    includes(String((first.style as Record<string, unknown>)['--token-value']), 'var(--first-token-');

    configureRuntime({ tokenVarPrefix: 'next-token-' });

    const next = resolveStyleProp(css as any);

    includes(String((next.style as Record<string, unknown>)['--token-value']), 'var(--next-token-');
  } finally {
    configureRuntime({ dev: false });
  }
});

test('rsc dev payload is emitted by getClassName', () => {
  clearRscStyleStore();
  setBuildMeta({ dev: true, extract: false, hoist: false, rsc: true, css: null });

  const pool = createCombinedStylePool();
  const css = pool.get(styles, [], []).style;
  const manual = getClassName(css.container);
  const manualProps = manual as Record<string, unknown>;
  const result = transformRscElement({
    type: 'div',
    props: {
      css: css.container,
      id: 'target',
    },
  });
  const props = result.props as Record<string, unknown>;
  const storeCss = getRscStyleCss();

  setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  configureRuntime({ dev: false });

  equal(props.id, 'target');
  equal(typeof manual.className, 'string');
  equal(typeof manualProps[ELEMENT_CSS_DATA_ATTR], 'string');
  includes(storeCss, '@layer css.');
  includes(storeCss, 'color');
  equal(typeof props.className, 'string');
  equal(typeof props[ELEMENT_CSS_DATA_ATTR], 'string');
  equal('css' in props, false);
});

test('rsc getClassName omits dev payload without css rules', () => {
  clearRscStyleStore();
  setBuildMeta({ dev: true, extract: false, hoist: false, rsc: true, css: null });

  const manual = getClassName(undefined, {
    className: 'external',
  }) as Record<string, unknown>;
  const result = transformRscElement({
    type: 'div',
    props: {
      className: 'external',
    },
  });
  const props = result.props as Record<string, unknown>;
  const storeCss = getRscStyleCss();

  setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  configureRuntime({ dev: false });
  clearRscStyleStore();

  equal(manual.className, 'external');
  equal(ELEMENT_CSS_DATA_ATTR in manual, false);
  equal(props.className, 'external');
  equal(ELEMENT_CSS_DATA_ATTR in props, false);
  equal(storeCss, '');
});

test('rsc dev style store wraps parent selector priority rules in layers', () => {
  clearRscStyleStore();
  setBuildMeta({ dev: true, extract: false, hoist: false, rsc: true, css: null });

  const card = {
    root: style.slot({
      padding: 12,
    }),
    button: style.slot({
      background: 'black',
    }).hover({
      background: 'red',
    }),
  };
  const parentHover = style.scope().hover([
    card.button({
      background: 'blue',
    }),
  ]);
  const css = combineStyle(card, bindScope(card.root, parentHover));

  getClassName(css.root);
  getClassName(css.button);

  const storeCss = getRscStyleCss();
  const blueLayer = getLayerNameForRule(storeCss, 'background: blue');
  const redLayer = getLayerNameForRule(storeCss, 'background: red');

  setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  configureRuntime({ dev: false });
  clearRscStyleStore();

  includes(storeCss, '@layer css.');
  includes(storeCss, ':hover');
  includes(storeCss, 'background: blue');
  includes(storeCss, 'background: red');
  before(storeCss.split('\n')[0], blueLayer, redLayer);
});
