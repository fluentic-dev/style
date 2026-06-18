import {
  clearRscStyleStore,
  combineStyle,
  configureTestRuntime,
  createCompiler,
  createExtractedSlot,
  createTheme,
  createThemeRule,
  createToken,
  createTokens,
  ELEMENT_CSS_DATA_ATTR,
  equal,
  fileURLToPath,
  getRscClassName,
  getToken,
  includes,
  notEqual,
  readFileSync,
  resolveStyleProp,
  setBuildMeta,
  style,
  test,
  transformRscElement,
} from './setup';

test('invariant: runtime token identity uses stable ids for nested tokens and aliases', () => {
  const base = createToken('blue', 'invariant-base');
  const alias = createToken(base, 'invariant-alias');
  const tokens = createTokens({
    color: {
      text: 'black',
      surface: 'white',
    },
  }, 'invariant-tokens');

  includes(String(getToken(base)), 'var(--token-invariant-base-');
  includes(String(getToken(base)), ', blue)');
  includes(String(getToken(alias)), 'var(--token-invariant-alias-');
  includes(String(getToken(alias)), 'var(--token-invariant-base-');
  includes(String(getToken(tokens.color.text)), 'var(--token-invariant-tokens--color--text-');
  includes(String(getToken(tokens.color.text)), ', black)');
  includes(String(getToken(tokens.color.surface)), 'var(--token-invariant-tokens--color--surface-');
  includes(String(getToken(tokens.color.surface)), ', white)');
});

test('invariant: extracted theme and style modules share imported token ids', () => {
  const compiler = createCompiler({ layer: false });
  const themeFile = fileURLToPath(new URL('./fixtures/theme_cross_themes.ts', import.meta.url));
  const stylesFile = fileURLToPath(new URL('./fixtures/theme_cross_styles.ts', import.meta.url));

  const themeResult = compiler.transform(readFileSync(themeFile, 'utf8'), themeFile);
  const stylesResult = compiler.transform(readFileSync(stylesFile, 'utf8'), stylesFile);

  if (!themeResult) throw new Error('expected theme compiler transform result');
  if (!stylesResult) throw new Error('expected styles compiler transform result');

  const css = stylesResult.css.join('\n');
  const themeTextVar = css.match(/(--token-[^:;{]+--color--text[^:;{]*):#0f172a/)?.[1];
  const themeSurfaceVar = css.match(/(--token-[^:;{]+--color--surface[^:;{]*):var\(--token-/)?.[1];
  const themeSpaceVar = css.match(/(--token-[^:;{]+--space--panel[^:;{]*):32/)?.[1];
  const styleTextVar = css.match(/color: var\(--var-[^,]+, var\((--token-[^,)]+)/)?.[1];
  const styleSurfaceVar = css.match(/background-color: var\(--var-[^,]+, var\((--token-[^,)]+)/)?.[1];
  const styleSpaceVar = css.match(/padding: var\(--var-[^,]+, var\((--token-[^,)]+)/)?.[1];

  equal(styleTextVar, themeTextVar);
  equal(styleSurfaceVar, themeSurfaceVar);
  equal(styleSpaceVar, themeSpaceVar);
  notEqual(themeTextVar, themeSurfaceVar);
  notEqual(themeSurfaceVar, themeSpaceVar);
  includes(themeResult.code, 'createExtractedTheme');
  includes(stylesResult.code, 'createExtractedSlot');
});

test('invariant: theme override class stays overridable by local dynamic token value', () => {
  const token = createToken('blue', 'invariant-theme-local');
  const tokenStyles = {
    container: style.slot({
      color: token,
    }),
  };
  const theme = createTheme([token('red')], 'invariant-theme');
  const css = combineStyle(tokenStyles, token('green'));
  const result = resolveStyleProp([theme, css.container as any]);
  const rule = createThemeRule(theme);

  if (!result.style) throw new Error('expected local token variable style');

  includes(result.className, theme.className);
  includes(rule, '--token-invariant-theme-local-');
  includes(rule, ':red');
  const varName = Object.keys(result.style as Record<string, unknown>).find((key) =>
    key.startsWith('--token-invariant-theme-local-')
  );
  if (!varName) throw new Error('expected invariant local theme token variable');
  equal((result.style as Record<string, unknown>)[varName], 'green');
});

test('invariant: extracted dynamic variables preserve token fallback chain', () => {
  const token = createToken('blue', 'invariant-extracted-token');
  const css = createExtractedSlot('invariant-extracted-slot', [
    [
      'invariant-dedupe',
      'invariant-class',
      [1, '--invariant-local', token],
    ],
  ]);
  const result = resolveStyleProp(css as any);

  equal(result.className, 'invariant-class');
  includes(
    String((result.style as Record<string, unknown>)['--invariant-local']),
    'var(--token-invariant-extracted-token-',
  );
});

test('invariant: rsc style prop serialization removes functions and emits dev payload', () => {
  clearRscStyleStore();
  setBuildMeta({ dev: true, extract: false, hoist: false, rsc: true, css: null });

  try {
    const token = createToken('blue', 'invariant-rsc');
    const rscStyles = {
      root: style.slot({
        color: token,
      }),
    };
    const result = transformRscElement({
      type: 'div',
      props: {
        css: rscStyles.root,
        id: 'rsc-target',
      },
    });
    const props = result.props as Record<string, unknown>;
    const manual = getRscClassName(rscStyles.root) as Record<string, unknown>;

    equal(props.id, 'rsc-target');
    equal('css' in props, false);
    equal(typeof props.className, 'string');
    equal(typeof props[ELEMENT_CSS_DATA_ATTR], 'string');
    equal(typeof manual[ELEMENT_CSS_DATA_ATTR], 'string');
  } finally {
    setBuildMeta({ dev: false, extract: false, hoist: false, rsc: false, css: null });
    configureTestRuntime({ dev: false });
    clearRscStyleStore();
  }
});
