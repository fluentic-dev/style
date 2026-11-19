import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = path.join(root, 'docs/app/public');
const index = await readFile(path.join(root, 'llms.txt'), 'utf8');
const files = new Map([['llms.txt', index]]);

async function collect(relative) {
  for (
    const entry of (await readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  ) {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await collect(name);
    else if (entry.name.endsWith('.txt')) files.set(name, await readFile(path.join(root, name), 'utf8'));
  }
}
await collect('llms');
const exampleRoot = path.join(root, 'examples/llm-basic');
const examplePackage = JSON.parse(await readFile(path.join(exampleRoot, 'package.json'), 'utf8'));
examplePackage.dependencies['@fluentic/style'] = 'beta';
delete examplePackage.scripts['test:browser'];
delete examplePackage.devDependencies['playwright-core'];
const exampleFiles = [
  'package.json',
  'index.html',
  'tsconfig.json',
  'vite.config.ts',
  'src/button.styles.ts',
  'src/Button.tsx',
  'src/theme.ts',
  'src/App.tsx',
  'src/main.tsx',
];
const exampleParts = [
  '# Fluentic Style: complete React + Vite example',
  'Generated from the validated @example/llm-basic workspace example.',
  'Create the files below in an empty directory. Run npm install, npm run typecheck, and npm run build; use npm run dev to open the app. Other package managers work too. For an existing app, merge configuration and keep its installed framework versions.',
  'Read setup and core for API semantics. Button owns its tokens and slots; theme.ts connects them to app values. The app switches token themes, selects variants, overrides public parts, and puts consumer root css last. Native button props and event handlers are preserved.',
  'The package manifest is generated from the workspace example with a public dependency version and without repository-only browser test tooling. All other files are copied verbatim. File order below is for reading, not execution.',
];
for (const name of exampleFiles) {
  const content = name === 'package.json'
    ? JSON.stringify(examplePackage, null, 2) + '\n'
    : await readFile(path.join(exampleRoot, name), 'utf8');
  const language = path.extname(name).slice(1);
  exampleParts.push(`## ${name}\n\n\`\`\`${language}\n${content.trimEnd()}\n\`\`\``);
}
files.set('llms/example.txt', exampleParts.join('\n\n') + '\n');
files.set(
  'llms-full.txt',
  [
    '# Fluentic Style: complete implementation and migration guide',
    'Generated from llms.txt and llms/*.txt. Read setup and core, then only the migration relevant to your project.',
    ...[
      'llms/setup.txt',
      ...[...files.keys()].filter((name) => name.startsWith('llms/integrations/')),
      'llms/core.txt',
      'llms/example.txt',
      'llms/advanced.txt',
      'llms/migrations/common.txt',
      ...[...files.keys()].filter((name) => name.startsWith('llms/migrations/') && !name.endsWith('/common.txt')),
    ]
      .map((name) => `---\n\nSource: ${name}\n\n${files.get(name)}`),
  ].join('\n\n'),
);

// Fail the build rather than publish broken agent-guide links.
for (const [name, content] of files) {
  for (const match of content.matchAll(/https:\/\/fluenticstack\.com\/style\/(llms[^\s)\]]*\.txt)/g)) {
    if (!files.has(match[1])) throw new Error(`${name}: missing guide ${match[1]}`);
  }
}
// Estimates are character-based, not model-specific tokenizer measurements.
for (const [name, content] of files) {
  console.log(`${name}: ${content.length} characters, ~${Math.ceil(content.length / 4)} tokens (estimate)`);
}
if (process.argv.includes('--check')) {
  console.log(`Validated ${files.size} guides and generated the example in memory.`);
  process.exit(0);
}
await mkdir(publicDir, { recursive: true });
await rm(path.join(publicDir, 'llms'), { recursive: true, force: true });
for (const [name, content] of files) {
  const target = path.join(publicDir, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}
console.log(`Published ${files.size} LLM text assets to docs/app/public`);
