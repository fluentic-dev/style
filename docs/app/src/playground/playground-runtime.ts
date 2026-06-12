import { configureRuntime } from '../../../../packages/style/config';
import { collectDevCssRules } from '../../../../packages/style/runtime/dev';
import { getClassName, getCss } from '../../../../packages/style/runtime/static';
import type { CssProp } from '../../../../packages/style/runtime/types';
import { style } from '../../../../packages/style/style';
import { createTheme } from '../../../../packages/style/style/theme';
import { createToken, createTokens } from '../../../../packages/style/style/value';

type PlaygroundFile = { name: string; code: string; };
type RuntimeRequest = { files: PlaygroundFile[]; config: Record<string, unknown>; };
type RuntimeResult = { html: string; css: string; };

export function runRuntime(request: RuntimeRequest): RuntimeResult {
  // Force options needed for the playground trace panel and class name readability
  configureRuntime({ ...request.config, dev: true, localClassName: true, debugClassName: true });

  const source = request.files
    .map((file) => `/* ${file.name} */\n${stripModuleSyntax(file.code)}`)
    .join('\n\n');

  const cssRules: string[] = [];
  const seen = new Set<string>();

  function collectFromCss(css: CssProp) {
    for (const [, ruleCss] of collectDevCssRules(css)) {
      if (seen.has(ruleCss)) continue;
      seen.add(ruleCss);
      cssRules.push(ruleCss);
    }
  }

  // Real getClassName wrapped to also collect CSS rules for the iframe stylesheet
  function wrappedGetClassName(css: CssProp, props: Record<string, unknown> = {}) {
    collectFromCss(css);
    return getClassName(css, props as Parameters<typeof getClassName>[1]);
  }

  // Real getCss wrapped to collect CSS for all slots up front
  function wrappedGetCss<T extends object>(styles: T, ...args: unknown[]): T {
    const result = getCss(styles, ...(args as any[]));

    for (const key of Object.keys(result as object)) {
      const cssProp = (result as Record<string, unknown>)[key];
      if (cssProp) collectFromCss(cssProp as CssProp);
    }

    return result as any;
  }

  const renderApp = new Function(
    'style',
    'getCss',
    'getClassName',
    'createToken',
    'createTokens',
    'createTheme',
    source + '\nreturn typeof renderApp === "function" ? renderApp : null;',
  )(
    style,
    wrappedGetCss,
    wrappedGetClassName,
    createToken,
    createTokens,
    createTheme,
  ) as (() => string) | null;

  return {
    html: renderApp ? renderApp() : '',
    css: cssRules.join('\n'),
  };
}

function stripModuleSyntax(code: string) {
  return code
    .replace(/import\s+[^;]+;\n?/g, '')
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+let\s+/g, 'let ')
    .replace(/export\s+var\s+/g, 'var ');
}
