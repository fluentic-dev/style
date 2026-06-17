import { transformElement as transformExtractedElement } from '../runtime/extract/jsx';
import { ArgSelectors } from '../selector/presets';
import { getStyleTokenId, getStyleTokenOverrideDebug } from '../style/token';
import {
  before,
  bindScope,
  BUILDER_STATE,
  BUILDER_TYPE_SCOPE,
  clearRscStyleStore,
  combineStyle,
  configureRuntime,
  createCombinedStylePool,
  createCounterStyle,
  createDevSheet,
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedToken,
  createFakeDocument,
  createFontFace,
  createFontPaletteValues,
  createKeyframes,
  createPositionTry,
  createProperty,
  createRscStylePayload,
  createScopeBuilder,
  createScrollTimeline,
  createStyleFn,
  createTheme,
  createThemeRule,
  createToken,
  createTokens,
  createViewTimeline,
  type DebugData,
  ELEMENT_CSS_DATA_ATTR,
  equal,
  fontSrc,
  getClassName,
  getCombinedStyleScopes,
  getGlobalSheet,
  getLayerNameForRule,
  getRscClassName,
  getRscDevInitialStyleSelector,
  getRscStyleCss,
  getToken,
  hoverTheme,
  includes,
  ITEM_VALUE_NUMBER_PX,
  notEqual,
  notIncludes,
  parseRscStylePayload,
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

test('style prop resolver strips debug element marker before walking css items', () => {
  const direct = style({
    color: 'orchid',
  });

  const result = resolveStyleProp([{
    $$elementDebug: true,
    loc: [69, 9],
    label: 'appTheme',
    sourceUrl: 'source:///src/page.tsx',
  }, direct] as any);

  if (!result.className) throw new Error('expected class name');
});

test('style prop resolver ignores bare debug element marker', () => {
  const result = resolveStyleProp({
    $$elementDebug: true,
    loc: [69, 9],
    label: 'appTheme',
    sourceUrl: 'source:///src/page.tsx',
  } as any);

  equal(Boolean(result.className), false);
  equal(result.style, undefined);
});

test('style prop resolver normalizes numeric debug variable values by property', () => {
  const rule = (style as any)({
    padding: 12,
    opacity: 0.5,
  }, {
    $$debug: true,
    loc: [1, 1],
    label: ['rule', 'style', 'runtime.test.ts'],
    vars: {
      padding: '--debug-padding',
      opacity: '--debug-opacity',
    },
    sourceUrl: 'source:///runtime.test.ts',
  });

  const result = resolveStyleProp(rule);
  const styleVars = result.style as Record<string, unknown>;

  equal(styleVars['--debug-padding'], '12px');
  equal(styleVars['--debug-opacity'], '0.5');
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

test('jsx style prop prepends debug element marker class in dev', () => {
  const direct = style({
    color: 'plum',
  });

  try {
    setBuildMeta({
      dev: true,
      extract: false,
      hoist: false,
      rsc: false,
      css: {
        debugElementClassName: true,
        debugElementClassNamePrefix: 'elm-',
      },
    });

    const result = transformElement({
      type: 'div',
      source: {
        fileName: 'source:///src/Card.tsx',
        lineNumber: 12,
        columnNumber: 3,
      },
      props: {
        css: [{
          $$elementDebug: true,
          loc: [12, 3],
          label: 'container',
          sourceUrl: 'source:///src/Card.tsx',
        }, direct],
        className: 'external',
      },
    });
    const props = result.props as { className?: string; css?: unknown; };

    if (!props.className) throw new Error('expected transformed class name');

    const classNames = props.className.split(' ');
    equal(classNames[0].startsWith('elm-container-'), true);
    equal(classNames[1], 'external');
    equal(props.css, undefined);
  } finally {
    setBuildMeta(null);
  }
});

test('style value ref inserts keyframes when consumed', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const enter = createKeyframes({
    from: {
      opacity: 0,
      transform: 'scale(0.95) translateY(16px)',
    },
    to: {
      opacity: 1,
      transform: 'none',
    },
  });
  const direct = style({
    animationName: enter,
    animationDuration: '180ms',
  });
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    const result = getClassName(direct);

    if (!result.className) throw new Error('expected class name');

    const text = document.head.textContent;

    includes(text, '@keyframes');
    includes(text, 'from{');
    includes(text, 'to{');
    includes(text, 'animation-name');
    includes(text, enter.value);
  } finally {
    setGlobalSheet(previousSheet);
  }
});

test('style.keyframes applies the style function transform', () => {
  const custom = createStyleFn({
    style: null as any,
    selectors: ArgSelectors,
    transform: {
      transform(style: Record<string, unknown>) {
        const result = { ...style };
        if (result.tone === 'brand') {
          delete result.tone;
          result.color = 'blue';
        }
        return result;
      },
    },
  }).style;
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const enter = custom.keyframes({
    from: {
      tone: 'brand',
      opacity: 0,
    },
    to: {
      tone: 'brand',
      opacity: 1,
    },
  });
  const direct = custom({
    animationName: enter,
    animationDuration: '180ms',
  });
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    getClassName(direct);

    const text = document.head.textContent;

    includes(text, '@keyframes');
    includes(text, 'color: blue;');
    notIncludes(text, 'tone');
    includes(text, enter.value);
  } finally {
    setGlobalSheet(previousSheet);
  }
});

test('style value ref inserts font-face when consumed', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const mona = createFontFace({
    src: fontSrc('/fonts/Mona-Sans.woff2', 'woff2'),
    fontWeight: 400,
    fontStyle: 'normal',
    fontDisplay: 'swap',
  });
  const direct = style({
    fontFamily: mona,
  });
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    const result = getClassName(direct);

    if (!result.className) throw new Error('expected class name');

    const text = document.head.textContent;

    includes(text, '@font-face');
    includes(text, 'src: url("/fonts/Mona-Sans.woff2") format("woff2")');
    includes(text, 'font-weight: 400;');
    notIncludes(text, 'font-weight: 400px;');
    includes(text, 'font-family');
    includes(text, mona.value);
  } finally {
    setGlobalSheet(previousSheet);
  }
});

test('style value ref inserts additional at-rules when consumed', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const positionTry = createPositionTry({
    insetArea: 'bottom',
    margin: '8px',
  });
  const counterStyle = createCounterStyle({
    system: 'cyclic',
    symbols: '"*"',
    suffix: '" "',
  });
  const property = createProperty('--spin-angle', {
    syntax: '"<angle>"',
    inherits: false,
    initialValue: '0deg',
  });
  const scrollTimeline = createScrollTimeline({
    source: 'auto',
    orientation: 'block',
  });
  const viewTimeline = createViewTimeline({
    subject: 'auto',
    axis: 'block',
  });
  const palette = createFontPaletteValues({
    fontFamily: 'system-ui',
    basePalette: 1,
  });
  const direct = style({
    positionTryFallbacks: positionTry,
    listStyleType: counterStyle,
    transitionProperty: property,
    animationTimeline: scrollTimeline,
    fontPalette: palette,
  });
  const viewTimelineStyle = style({
    animationTimeline: viewTimeline,
  });
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    getClassName(direct);
    getClassName(viewTimelineStyle);

    const text = document.head.textContent;

    includes(text, '@position-try');
    includes(text, 'inset-area: bottom;');
    includes(text, '@counter-style');
    includes(text, 'symbols: "*";');
    includes(text, '@property --spin-angle');
    includes(text, 'inherits: false;');
    includes(text, '@scroll-timeline');
    includes(text, '@view-timeline');
    includes(text, '@font-palette-values');
    includes(text, 'base-palette: 1;');
    includes(text, positionTry.value);
    includes(text, counterStyle.value);
    includes(text, scrollTimeline.value);
    includes(text, viewTimeline.value);
    includes(text, palette.value);
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

test('token override stores injected debug metadata', () => {
  const token = createToken('blue');
  const debug: DebugData = {
    $$debug: true,
    loc: [12, 3],
    label: ['token', 'themeColor', 'tokens.ts'],
    sourceUrl: '/src/tokens.ts',
  };

  const override = token('red', debug);

  equal(getStyleTokenOverrideDebug(override), debug);
});

test('scope dedupes token overrides by token id', () => {
  const token = createToken('blue');
  const scope = style.scope([
    token('red'),
    token('green'),
  ]);

  equal(scope[BUILDER_STATE].items.length, 1);
  equal((scope[BUILDER_STATE].items[0] as any).value, 'green');
});

test('scope merge dedupes token overrides by token id', () => {
  const token = createToken('blue');
  const scopeFn = createScopeBuilder<Record<string, unknown>, typeof ArgSelectors>(ArgSelectors);
  const first = style.scope([
    token('red'),
  ]);
  const second = style.scope([
    token('green'),
  ]);
  const scope = scopeFn()
    .merge(first)
    .merge(second);

  equal(scope[BUILDER_STATE].items.length, 1);
  equal((scope[BUILDER_STATE].items[0] as any).value, 'green');
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

test('generated id counters are shared across duplicate module instances', async () => {
  const tokenAPath = '../style/token.ts?counter-a';
  const tokenBPath = '../style/token.ts?counter-b';
  const themeAPath = '../style/theme.ts?counter-a';
  const themeBPath = '../style/theme.ts?counter-b';
  const keyframesAPath = '../css/keyframes.ts?counter-a';
  const keyframesBPath = '../css/keyframes.ts?counter-b';

  const tokenA = await import(tokenAPath) as typeof import('../style/token');
  const tokenB = await import(tokenBPath) as typeof import('../style/token');
  const themeA = await import(themeAPath) as typeof import('../style/theme');
  const themeB = await import(themeBPath) as typeof import('../style/theme');
  const keyframesA = await import(keyframesAPath) as typeof import('../css/keyframes');
  const keyframesB = await import(keyframesBPath) as typeof import('../css/keyframes');

  tokenA.resetStyleTokenIdCounter();
  themeA.resetStyleThemeIdCounter();

  equal(tokenA.getStyleTokenId(tokenA.createStyleToken('a')), '0');
  equal(tokenB.getStyleTokenId(tokenB.createStyleToken('b')), '1');
  equal(getStyleTokenId(tokenB.createStyleToken('c')), '2');

  equal(themeA.createTheme([tokenA.createStyleToken('a')('a')]).id, '0');
  equal(themeB.createTheme([tokenB.createStyleToken('b')('b')]).id, '1');

  const first = keyframesA.createKeyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
  const second = keyframesB.createKeyframes({ from: { opacity: 1 }, to: { opacity: 0 } });

  notEqual(first.value, second.value);
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
  const css = (style.slot as any)({
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

test('style prop resolver applies extracted numeric value mode markers', () => {
  const styles = {
    container: createExtractedSlot('numeric-marker-slot', [
      ['numeric-marker-size-dedupe', 'numeric-marker-size-class', [
        1,
        '--numeric-marker-size',
        12,
        ITEM_VALUE_NUMBER_PX,
      ]],
      ['numeric-marker-opacity-dedupe', 'numeric-marker-opacity-class', [
        1,
        '--numeric-marker-opacity',
        0.5,
      ]],
    ]),
  };
  const pool = createCombinedStylePool();
  const css = pool.get(styles, [], []).style;
  const result = resolveStyleProp(css.container as any);

  equal(result.className, 'numeric-marker-size-class numeric-marker-opacity-class');
  equal((result.style as Record<string, unknown>)['--numeric-marker-size'], '12px');
  equal((result.style as Record<string, unknown>)['--numeric-marker-opacity'], '0.5');
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

test('extracted transform keeps combined token values dynamic across pooled styles', () => {
  const tone = createExtractedToken('combined-token-cache-tone', '#0f766e');
  const surface = createExtractedToken('combined-token-cache-surface', 'rgba(240,253,250,0.92)');
  const card = createExtractedSlot('combined-token-cache-card', [
    ['combined-token-cache-card-dedupe', 'combined-token-cache-card-class'],
  ]);
  const panel = createExtractedSlot('combined-token-cache-panel', [
    ['combined-token-cache-panel-bg', 'combined-token-cache-panel-bg-class', [1, '--combined-panel-bg', surface]],
    ['combined-token-cache-panel-border', 'combined-token-cache-panel-border-class', [
      1,
      '--combined-panel-border',
      tone,
    ]],
  ]);
  const styles = { card, panel };

  try {
    setBuildMeta({ dev: false, extract: true, hoist: true, rsc: false, css: null });

    const green = combineStyle(
      styles,
      tone('#0f766e'),
      surface('rgba(240,253,250,0.92)'),
    );
    const brown = combineStyle(
      styles,
      tone('#7c2d12'),
      surface('rgba(239,246,255,0.92)'),
    );

    const first = transformExtractedElement({
      type: 'article',
      props: { css: [green.card, green.panel] },
    }).props as { className?: string; style?: Record<string, unknown>; };
    const second = transformExtractedElement({
      type: 'article',
      props: { css: [brown.card, brown.panel] },
    }).props as { className?: string; style?: Record<string, unknown>; };

    equal(
      first.className,
      'combined-token-cache-card-class combined-token-cache-panel-bg-class combined-token-cache-panel-border-class',
    );
    equal(second.className, first.className);
    equal(first.style?.['--combined-panel-bg'], 'rgba(240,253,250,0.92)');
    equal(first.style?.['--combined-panel-border'], '#0f766e');
    equal(second.style?.['--combined-panel-bg'], 'rgba(239,246,255,0.92)');
    equal(second.style?.['--combined-panel-border'], '#7c2d12');
  } finally {
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
  }
});

test('style value ref token deps resolve from direct token bindings', () => {
  const enterTransform = createToken('translateY(8px)', 'enter-transform');
  const enter = createKeyframes({
    from: {
      transform: enterTransform,
    },
    to: {
      transform: 'none',
    },
  });
  const direct = style({
    animationName: enter,
  });

  try {
    setBuildMeta({ dev: false, extract: true, hoist: true, rsc: false, css: null });

    const result = resolveStyleProp(withTokens(direct, [
      enterTransform('translateY(24px)'),
    ] as never));

    equal(result.style?.['--token-enter-transform' as never], 'translateY(24px)');
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

test('style prop resolver wires token-bound extracted scope variables', () => {
  const token = createExtractedToken('bound-scope-item-token', 'blue');
  const styles = {
    container: createExtractedSlot('bound-scope-item-slot', [
      ['bound-scope-item-base-dedupe', 'bound-scope-item-base-class'],
    ]),
  };
  const scope = createExtractedScope([
    [
      BUILDER_TYPE_SCOPE,
      'bound-scope-item-slot',
      'bound-scope-item-dedupe',
      'bound-scope-item-class',
      [1, '--bound-scope-item-value', token],
    ],
  ]);

  try {
    setBuildMeta({ dev: false, extract: true, hoist: true, rsc: false, css: null });

    const css = combineStyle(styles, withTokens(scope(styles.container), [token('red')]));
    const result = resolveStyleProp(css.container as any);

    equal(result.className, 'bound-scope-item-base-class bound-scope-item-class');
    equal((result.style as Record<string, unknown>)['--bound-scope-item-value'], 'red');
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
  const manual = getRscClassName(css.container);
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

test('rsc dev payload trims bulky debug metadata', () => {
  const payload = createRscStylePayload([{
    key: 'color-test',
    css: '.color-test{color:red}',
    priority: [0, 0, 0, 0, 0, 0, 0],
    callsite: null,
    debugField: 'color',
    debug: {
      $$debug: true,
      sourceUrl: 'source://@app/page.tsx',
      code: 'const veryLongSource = "inline source content should not be serialized";',
      label: ['slot', 'style.slot', 'page.tsx'],
      loc: [4, 3],
      fields: {
        color: [5, 7],
        backgroundColor: [8, 9],
      },
      vars: {},
    },
  }]);
  const parsed = JSON.parse(payload);

  equal(parsed.length, 1);
  equal(parsed[0].key, 'color-test');
  equal('callsite' in parsed[0], false);
  equal(parsed[0].debug.sourceUrl, 'source://@app/page.tsx');
  equal(parsed[0].debug.fields.color[0], 5);
  equal(parsed[0].debug.fields.color[1], 7);
  equal('backgroundColor' in parsed[0].debug.fields, false);
  equal(parsed[0].debugField, 'color');
  equal('code' in parsed[0].debug, false);
  notIncludes(payload, 'veryLongSource');
});

test('rsc dev payload keeps only selected debug trace field', () => {
  const payload = createRscStylePayload([{
    key: 'color-test',
    css: '.color-test{color:red}',
    priority: [0, 0, 0, 0, 0, 0, 0],
    callsite: null,
    debugField: 'color',
    debug: {
      $$debug: true,
      sourceUrl: 'source://@app/page.tsx',
      code: 'source content should not be serialized',
      label: ['slot', 'style.slot', 'page.tsx'],
      loc: [4, 3],
      fields: {
        color: {
          0: [5, 7],
          1: [6, 8],
        },
        backgroundColor: {
          0: [8, 9],
        },
      },
      vars: {},
    },
  }]);
  const parsed = JSON.parse(payload);

  equal(parsed[0].debug.fields.color[0][0], 5);
  equal(parsed[0].debug.fields.color[1][0], 6);
  equal('backgroundColor' in parsed[0].debug.fields, false);
  equal('code' in parsed[0].debug, false);
});

test('rsc dev compact payload is accepted by client observer parser', () => {
  const payload = createRscStylePayload([{
    key: 'color-test',
    css: '.color-test{color:red}',
    priority: [0, 0, 0, 0, 0, 0, 0],
    callsite: {
      filePath: 'source://@app/page.tsx',
      sourceUrl: 'source://@app/page.tsx',
      sourceContent: 'source content should be omitted before parsing',
      line: 5,
      column: 7,
    },
    debugField: 'color',
    debug: {
      $$debug: true,
      sourceUrl: 'http://127.0.0.1:1234/app/page.tsx',
      code: 'source content should be omitted before parsing',
      label: ['slot', 'style.slot', 'page.tsx'],
      loc: [4, 3],
      fields: {
        color: [5, 7],
      },
      vars: {},
    },
  }]);
  const rules = parseRscStylePayload(payload);
  const wire = JSON.parse(payload);

  equal(rules.length, 1);
  equal('callsite' in wire[0], false);
  equal(rules[0].key, 'color-test');
  equal(rules[0].css, '.color-test{color:red}');
  equal(rules[0].callsite, undefined);
  equal(rules[0].debug?.sourceUrl, 'http://127.0.0.1:1234/app/page.tsx');
  equal(rules[0].debugField, 'color');
  equal('code' in rules[0].debug!, false);
});

test('rsc dev payload preserves debug source urls without callsites', () => {
  const payload = createRscStylePayload([{
    key: 'color-test',
    css: '.color-test{color:red}',
    priority: [0, 0, 0, 0, 0, 0, 0],
    callsite: {
      filePath: '/Users/example/project/app/page.tsx',
      sourceUrl: '/Users/example/project/app/page.tsx',
      line: 5,
      column: 7,
    },
    debug: {
      $$debug: true,
      sourceUrl: '/Users/example/project/app/page.tsx',
      label: ['slot', 'style.slot', 'page.tsx'],
      loc: [4, 3],
    },
  }]);
  const parsed = JSON.parse(payload);
  const rules = parseRscStylePayload(payload);

  equal(parsed.length, 1);
  equal('callsite' in parsed[0], false);
  equal(parsed[0].debug.sourceUrl, '/Users/example/project/app/page.tsx');
  equal(rules.length, 1);
  equal(rules[0].callsite, undefined);
  equal(rules[0].debug?.sourceUrl, '/Users/example/project/app/page.tsx');
});

test('rsc prod style prop omits dev payload', () => {
  clearRscStyleStore();
  setBuildMeta({ dev: false, extract: true, hoist: true, rsc: true, css: null });

  const pool = createCombinedStylePool();
  const css = pool.get(styles, [], []).style;
  const manual = getRscClassName(css.container) as Record<string, unknown>;
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
  equal(typeof props.className, 'string');
  equal(ELEMENT_CSS_DATA_ATTR in manual, false);
  equal(ELEMENT_CSS_DATA_ATTR in props, false);
  equal(storeCss, '');
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

test('rsc dev cleanup selector includes next managed seed style', () => {
  const selector = getRscDevInitialStyleSelector();

  includes(selector, '[data-fluentic-style-rsc-dev-link]');
  includes(selector, '[data-fluentic-style-rsc-dev-style]');
  includes(selector, '[data-href="href-fluentic-style-rsc-dev-style"]');
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

  getRscClassName(css.root);
  getRscClassName(css.button);

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
