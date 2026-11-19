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
files.set(
  'llms-full.txt',
  [
    '# Fluentic Style: complete implementation and migration guide',
    'Generated from llms.txt and llms/*.txt. Read setup and core, then only the migration relevant to your project.',
    ...[
      'llms/setup.txt',
      ...[...files.keys()].filter((name) => name.startsWith('llms/integrations/')),
      'llms/core.txt',
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
await mkdir(publicDir, { recursive: true });
await rm(path.join(publicDir, 'llms'), { recursive: true, force: true });
for (const [name, content] of files) {
  const target = path.join(publicDir, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}
console.log(`Published ${files.size} LLM text assets to docs/app/public`);
