import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let identity: string | null | undefined;

/** Fingerprint actual compiler and dependency bytes, including locally patched packages.
 * Computed once per process: replacing loaded compiler code requires restarting Node.
 */
export function getCompilerCacheIdentity(): string | null {
  if (identity !== undefined) return identity;
  try {
    const filename = typeof __filename === 'string' ? __filename : fileURLToPath(import.meta.url);
    const root = findPackageRoot(filename, '@fluentic/style');
    const hash = createHash('sha256');
    hash.update(JSON.stringify([
      process.versions,
      process.platform,
      process.arch,
      process.execArgv,
      process.env.NODE_OPTIONS,
      process.env.NODE_ENV,
      process.env.BABEL_ENV,
    ]));
    const visited = new Set<string>();
    const hashTree = (directory: string, source = false) => {
      for (
        const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
      ) {
        if (item.name === 'node_modules' || item.name === '.git') continue;
        const file = path.join(directory, item.name);
        if (item.isDirectory()) hashTree(file, source);
        else if (item.isFile()) {
          // Declarations, source maps and documentation are not executable compiler inputs.
          if (!(source ? /\.(?:[cm]?[jt]sx?|json|node|wasm)$/ : /\.(?:[cm]?js|json|node|wasm)$/).test(item.name)) {
            continue;
          }
          hash.update(file).update('\0').update(fs.readFileSync(file)).update('\0');
        } else {
          // Unusual package layouts should rebuild, not silently omit inputs.
          throw new Error('Unsupported package entry');
        }
      }
    };
    const visit = (directory: string) => {
      directory = fs.realpathSync(directory);
      if (visited.has(directory)) return;
      visited.add(directory);
      hashTree(directory);
      const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
      const require = createRequire(path.join(directory, 'package.json'));
      const optional = manifest.optionalDependencies ?? {};
      for (const name of Object.keys({ ...manifest.dependencies, ...optional }).sort()) {
        let dependency: string;
        try {
          dependency = resolvePackageRoot(require, name);
        } catch (error) {
          if (name in optional) {
            hash.update('absent:' + name);
            continue;
          }
          throw error;
        }
        visit(dependency);
      }
    };
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    hash.update(fs.readFileSync(path.join(root, 'package.json')));
    // Hash the implementation actually loaded. Packed builds execute dist, not shipped TS.
    if (filename.startsWith(path.join(root, 'dist') + path.sep)) {
      hashTree(path.join(root, 'dist'));
    } else {
      for (const item of manifest.files as string[]) {
        if (item === 'dist') continue;
        const file = path.join(root, item);
        if (!fs.existsSync(file)) continue;
        if (fs.statSync(file).isDirectory()) hashTree(file, true);
        else if (/\.[cm]?[jt]sx?$/.test(item)) hash.update(item).update(fs.readFileSync(file));
      }
    }
    const require = createRequire(path.join(root, 'package.json'));
    for (const name of ['@babel/core', '@jridgewell/trace-mapping', 'css-what', 'oxc-resolver', 'picomatch']) {
      visit(resolvePackageRoot(require, name));
    }
    identity = hash.digest('hex');
  } catch {
    identity = null;
  }
  return identity;
}

function resolvePackageRoot(require: NodeRequire, name: string): string {
  for (const directory of require.resolve.paths(name) ?? []) {
    const root = path.join(directory, name);
    if (fs.existsSync(path.join(root, 'package.json'))) return fs.realpathSync(root);
  }
  try {
    return path.dirname(require.resolve(name + '/package.json'));
  } catch {
    return findPackageRoot(require.resolve(name), name);
  }
}

function findPackageRoot(filename: string, name: string): string {
  let directory = path.dirname(filename);
  while (true) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === name) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('Package root not found');
    directory = parent;
  }
}
