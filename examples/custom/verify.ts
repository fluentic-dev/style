import { createCompiler } from '@fluentic/style/compiler';
import { style } from './src/style.ts';

const compiler = createCompiler({
  styleFn: style,
  importSources: [{ source: './src/style', name: 'style' }],
});

const source = `
import { style } from './src/style';
const s1 = style({ display: 'flex', row: true, gap: 8 });
const s2 = style({ display: 'flex', column: true, gap: 12 });
const s3 = style({ row: true }).onHover({ column: true });
`;

const result = compiler.transform(source, '/custom/verify.tsx');
if (!result) {
  console.error('FAIL: compiler returned null');
  process.exit(1);
}

const css = result.css?.join('\n') ?? '';
const compiled = result.code ?? '';

type Check = { description: string; pass: boolean; };

const checks: Check[] = [
  {
    description: 'flex-direction:row emitted (row:true transformed)',
    pass: css.includes('flex-direction:row'),
  },
  {
    description: 'flex-direction:column emitted (column:true transformed)',
    pass: css.includes('flex-direction:column'),
  },
  {
    description: ':hover with flex-direction:column (onHover transform)',
    pass: /flex-direction:column/.test(css) && /:hover/.test(css),
  },
  {
    description: 'no raw "row:" property in CSS (custom prop removed)',
    pass: !/\brow:[^/]/.test(css),
  },
  {
    description: 'no raw "column:" property in CSS (custom prop removed)',
    pass: !/\bcolumn:[^/]/.test(css),
  },
  {
    description: 'compiled output uses createPrecompiledStyle (build-time)',
    pass: compiled.includes('createPrecompiledStyle'),
  },
];

let failed = false;
for (const c of checks) {
  if (c.pass) {
    console.log(`  pass  ${c.description}`);
  } else {
    console.error(`  FAIL  ${c.description}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nVerify FAILED.');
  console.error('\nGenerated CSS:\n' + css);
  process.exit(1);
}

console.log('\nAll checks passed.');
console.log('\nGenerated CSS:\n' + css);
