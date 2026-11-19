import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getTokenVarName } from '../atomic/token';
import { BUILDER_STATE } from '../builder/data/const';
import * as extracted from '../builder/extract';
import { CompilerRuntimeMode, createCompiler as createProductionCompiler } from '../compiler';
import { createNamedToken, createNamedTokens, getNamedToken } from '../dialect';
import { getToken } from '../runtime/extract/token';
import { getStyleTokenVarName, type StyleTokenData } from '../style/token';
import { createCompiler, deepEqual, equal, includes, notEqual, notIncludes, style, test } from './setup';

function execute(code: string, names: string[], imports: Record<string, unknown> = {}) {
  const bindings = { ...extracted, getToken, createNamedToken, createNamedTokens, ...imports };
  const body = code.replace(/^import .*;$/gm, '').replace(/export const /g, 'const ').replace(
    /export function /g,
    'function ',
  );
  return new Function(...Object.keys(bindings), body + '\nreturn {' + names.join(',') + '};')(
    ...Object.values(bindings),
  );
}

function compile(code: string) {
  const result = createCompiler({ layer: false }).transform(code, '/tmp/extracted-token-contract.ts');
  if (!result) throw new Error('Expected compiled tokens');
  return result;
}

test('extracted factories support standalone getToken and preserve token references', () => {
  const result = compile(`
import { createToken, createTokens, createValues, getToken, style } from '@fluentic/style';
const base = createToken('blue');
const alias = createToken(base);
const group = createTokens({ color: { text: 'black' }, stops: [0, 1], empty: null });
const color = createValues(['#e8eaf0 | border', '#ffffff | surface']);
const border = '1px solid ' + getToken(color('#e8eaf0 | border'));
const card = style.slot({ color: alias, border, backgroundColor: group.color.text });
const selected = color('#e8eaf0 | border');
const override = color('#e8eaf0 | border', base);
const scope = style.scope([group.color.text('red')]);
`);
  notIncludes(result.code, ' = createToken(');
  notIncludes(result.code, ' = createTokens(');
  notIncludes(result.code, ' = createValues(');
  includes(result.code, 'createExtractedValues(');
  includes(result.code, "group.color.text('red')");
  const values = execute(result.code, [
    'base',
    'alias',
    'group',
    'color',
    'border',
    'card',
    'selected',
    'override',
    'scope',
  ]);
  equal(values.alias.ref, values.base);
  equal(values.selected, values.color('#e8eaf0 | border'));
  equal(values.override.ref, values.base);
  equal(getStyleTokenVarName(values.override), getStyleTokenVarName(values.selected));
  includes(values.border, 'var(' + getStyleTokenVarName(values.selected) + ', #e8eaf0)');
  includes(result.css.join('\n'), values.border);
  includes(String(getToken(values.alias)), String(getToken(values.base)));
  deepEqual(values.group.stops.value, [0, 1]);
  equal(values.group.empty.value, null);
  const items = values.card[BUILDER_STATE].items;
  // Runtime bindings reuse the exact declared token, rather than a reconstructed copy.
  equal(items.some((item: any) => item[4]?.[2] === values.alias), true);
  equal(items.some((item: any) => item[4]?.[2] === values.group.color.text), true);
});

test('extracted values retain key types, numeric parsing, lookup identity and override arity', () => {
  const result = compile(`
import { createTokens, createValues } from '@fluentic/style';
const numbers = createValues(Number, ['8 | small', '12; medium']);
const mixed = createValues([8, '8', '8 | label', '8 | label']);
const tuple = createTokens(['red', 'blue', 'red']);
`);
  const { numbers, mixed, tuple } = execute(result.code, ['numbers', 'mixed', 'tuple']);
  equal(numbers('8 | small').value, 8);
  equal(numbers('12; medium').value, 12);
  equal(mixed(8).value, 8);
  equal(mixed('8').value, '8');
  notEqual(mixed(8), mixed('8'));
  equal(mixed('8 | label'), mixed('8 | label'));
  equal(mixed('8', undefined).value, undefined);
  equal(mixed('8', 12, {}).value, 12);
  equal(tuple.red.value, 'red');
  equal(Object.keys(tuple).join(','), 'red,blue');
  let message = '';
  try {
    mixed('missing');
  } catch (error) {
    message = String(error);
  }
  includes(message, 'VALUE_NOT_FOUND');
});

test('named token names are global, hash-free, configuration-independent and collision-safe', () => {
  const colors = createNamedTokens('app.colors', { blue: { 600: '#2563eb' } });
  equal(getToken(colors.blue[600]), 'var(--token-app-colors-blue-600, #2563eb)');
  equal(getTokenVarName(colors.blue[600], 'custom-$hash'), '--token-app-colors-blue-600');
  equal(getTokenVarName(colors.blue[600]('red'), 'custom-$hash'), '--token-app-colors-blue-600');
  equal(getToken(createNamedToken('app.colors.blue.600', 'red')), 'var(--token-app-colors-blue-600, red)');
  equal(getToken(getNamedToken(colors, '$blue.600')), getToken(colors.blue[600]));
  const paths = createNamedTokens('app', {
    'a-b': { c: '' },
    a: { 'b-c': '', b: '' },
    'a.b': '',
    '_x2d_': '',
    '-': '',
    'é': '',
    '': '',
  });
  const tokens: StyleTokenData[] = [
    paths['a-b'].c,
    paths.a['b-c'],
    paths['a.b'],
    paths.a.b,
    paths['_x2d_'],
    paths['-'],
    paths['é'],
    paths[''],
  ];
  equal(getStyleTokenVarName(paths['a-b'].c), '--token-app-a_x2d_b-c');
  equal(getStyleTokenVarName(paths.a['b-c']), '--token-app-a-b_x2d_c');
  equal(getStyleTokenVarName(paths['a.b']), '--token-app-a_x2e_b');
  equal(getStyleTokenVarName(paths['_x2d_']), '--token-app-_x5f_x2d_x5f_');
  equal(getStyleTokenVarName(paths['é']), '--token-app-_xe9_');
  equal(getToken(createNamedToken('app.a-b', 'red')), 'var(--token-app-a_x2d_b, red)');
  equal(new Set(tokens.map(getStyleTokenVarName)).size, tokens.length);
});

test('invalid compiled value scales fail at build time', () => {
  for (const source of ['createValues([])', "createValues(Number, ['bad | number'])"]) {
    let message = '';
    try {
      compile(`import { createValues } from '@fluentic/style'; const values = ${source};`);
    } catch (error) {
      message = String(error);
    }
    includes(message, '[Style.values]');
  }
});

test('production custom factories and imported values execute standalone getToken without metadata loss', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fluentic-token-contract-')));
  try {
    const source = `import { createToken, createTokens, createValues } from '@fluentic/style';
export const base = createToken('blue');
export const provider = base('red');
export const group = createTokens({ color: { border: '#ddd' } });
export const color = createValues(['#e8eaf0 | border']);`;
    writeFileSync(join(root, 'values.ts'), source);
    writeFileSync(join(root, 'barrel.ts'), "export { base, group, color, provider } from './values';");
    const compiler = createProductionCompiler({
      projectDir: root,
      cacheDir: join(root, '.cache'),
      runtimeMode: CompilerRuntimeMode.Prod,
    }, {
      css: { layer: false, tokenNameFormat: 'custom[-(name)]-$hash' },
      importSources: [{ source: './style', name: 'style', styleFn: style }],
    });
    const definitions = compiler.compileExtract({ code: source, filePath: join(root, 'values.ts'), sourcemap: null })!;
    const values = execute(definitions.code, ['base', 'group', 'color', 'provider']);
    const consumer = compiler.compileExtract({
      code: `
import { getToken } from '@fluentic/style';
import { style } from './style';
import { base, group, color, provider as incoming } from './barrel';
const border = '1px solid ' + getToken(color('#e8eaf0 | border'));
export const card = style.slot({ border, color: base, borderColor: group.color.border });
export const value = getToken(group.color.border);
export function makeScope() { return style.scope([incoming]); }
`,
      filePath: join(root, 'reports.ts'),
      sourcemap: null,
    })!;
    const output = execute(consumer.code, ['card', 'value', 'makeScope'], { ...values, incoming: values.provider });
    equal(output.value, getToken(values.group.color.border));
    includes(consumer.code, '[incoming]');
    output.makeScope();
    includes(output.value, '--custom-');
    notIncludes(consumer.code, 'createExtractedToken(');
    equal(output.card[BUILDER_STATE].items.some((item: any) => item[4]?.[2] === values.base), true);
    includes(compiler.getExtractedCss(), String(getToken(values.color('#e8eaf0 | border'))));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('local token factories remain in their function while hoisted styles bind their values', () => {
  const result = compile(`
import { createToken, style } from '@fluentic/style';
export function make() {
  const color = createToken('blue');
  return style.slot({ color });
}
`);
  includes(result.code, 'withTokens(');
  const { make } = execute(result.code, ['make']);
  equal(typeof make, 'function');
  notEqual(make(), make());
});

test('compiled token defaults preserve array and object references', () => {
  const result = compile(`
import { createToken, createTokens } from '@fluentic/style';
const stops = [0, 1];
const config = { label: 'default' };
const token = createToken(config);
const tokens = createTokens({ stops });
`);
  const { stops, config, token, tokens } = execute(result.code, ['stops', 'config', 'token', 'tokens']);
  equal(token.value, config);
  equal(tokens.stops.value, stops);
});

test('compiled token group defaults respect object and array spreads', () => {
  const result = compile(`
import { createTokens } from '@fluentic/style';
const more = { color: 'red' };
const names = ['blue', 'green'];
const record = createTokens({ color: 'blue', ...more });
const tuple = createTokens(['red', ...names, 'yellow']);
`);
  const { record, tuple } = execute(result.code, ['record', 'tuple']);
  equal(record.color.value, 'red');
  equal(tuple.green.value, 'green');
  equal(tuple.yellow.value, 'yellow');
});

test('unresolved token group leaves produce a diagnostic instead of empty objects', () => {
  let message = '';
  try {
    compile(
      `import { createTokens } from '@fluentic/style'; function make(value) { const tokens = createTokens({ color: { value } }); return tokens; }`,
    );
  } catch (error) {
    message = String(error);
  }
  includes(message, 'factory inputs must be statically resolvable');
});
