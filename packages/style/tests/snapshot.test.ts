import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createCompiler, equal, injectStyleDebugData, test, testDir } from './setup';

const snapshotDir = join(testDir, 'snapshots');
const updateSnapshots = process.env.UPDATE_STYLE_SNAPSHOTS === '1';

const comprehensiveSource = [
  `import { combineStyle, createTheme, createTokens, style } from '@fluentic/style';`,
  `import { sharedInteractive } from './fixtures/merge_common';`,
  `import { cardBase, textBase } from './fixtures/shared';`,
  ``,
  `const tokens = createTokens({`,
  `  color: {`,
  `    bg: '#ffffff',`,
  `    fg: '#111827',`,
  `    accent: '#2563eb',`,
  `  },`,
  `});`,
  ``,
  `const appTheme = createTheme([`,
  `  tokens.color.bg('#f8fafc'),`,
  `  tokens.color.fg('#0f172a'),`,
  `]);`,
  ``,
  `const styles = {`,
  `  panel: style.slot({`,
  `    ...cardBase,`,
  `    ...textBase,`,
  `    borderColor: tokens.color.accent,`,
  `  }).media('(max-width: 700px)', {`,
  `    padding: 8,`,
  `  }),`,
  `  action: style({`,
  `    ...textBase,`,
  `    backgroundColor: tokens.color.bg,`,
  `  }).merge(sharedInteractive).hover({`,
  `    color: tokens.color.accent,`,
  `  }),`,
  `};`,
  ``,
  `const baseScope = style.scope([`,
  `  styles.panel({`,
  `    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',`,
  `  }),`,
  `]);`,
  ``,
  `const mergedScope = style.scope()`,
  `  .merge(baseScope)`,
  `  .hover([`,
  `    styles.panel({`,
  `      borderColor: '#94a3b8',`,
  `    }),`,
  `  ]);`,
  ``,
  `const directOverride = styles.panel({`,
  `  outlineColor: '#475569',`,
  `});`,
  ``,
  `const directOverrideScope = style.scope()`,
  `  .merge(directOverride);`,
  ``,
  `const sharedElevation = style({`,
  `  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',`,
  `});`,
  ``,
  `const chainedOverrideScope = style.scope([`,
  `  styles.panel({`,
  `    color: '#334155',`,
  `  }).merge(sharedElevation),`,
  `]);`,
  ``,
  `export default function App() {`,
  `  const css = combineStyle(styles, mergedScope, directOverrideScope, chainedOverrideScope);`,
  `  return <main css={[appTheme, css.panel, styles.action]}>snapshot</main>;`,
  `}`,
  ``,
].join('\n');

test('snapshot: debug and extract transforms cover spread merge media theme', () => {
  const filePath = testDir + 'snapshot-comprehensive.tsx';

  const debug = injectStyleDebugData(
    comprehensiveSource,
    filePath,
    { rootDir: testDir },
  ).code;

  const extract = createCompiler({
    css: {
      debugClassName: true,
      layer: true,
    },
  }).transform(comprehensiveSource, filePath);

  if (!extract) throw new Error('expected extract transform result');

  assertSnapshot('debug-transform-comprehensive.debug.snap', debug);
  assertSnapshot('debug-transform-comprehensive.extract.snap', extract.code);
  assertSnapshot('debug-transform-comprehensive.extract-css.snap', extract.css.join('\n') + '\n');
});

function assertSnapshot(name: string, actual: string) {
  const filePath = join(snapshotDir, name);

  if (updateSnapshots) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, actual, 'utf8');
    return;
  }

  const expected = readFileSync(filePath, 'utf8');
  equal(actual, expected);
}
