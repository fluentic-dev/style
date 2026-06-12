import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type GetPortFilePathArgs = {
  cacheDir: string;
};

export type GetRoutePathArgs = {
  filePath: string;
  projectDir: string;
  relativePath?: string | null;
};

export type CreateSourceUrlArgs = {
  host: string;
  port: number;
  routePath: string;
};

export type NormalizeRoutePathArgs = {
  routePath: string;
};

export type ReadCachedPortArgs = {
  filePath: string;
};

export type WriteCachedPortArgs = {
  filePath: string;
  port: number;
};

export type IsPortUnavailableErrorArgs = {
  error: unknown;
};

export function getPortFilePath(args: GetPortFilePathArgs) {
  return path.join(args.cacheDir, 'sidecar', 'port.json');
}

export function getRoutePath(args: GetRoutePathArgs) {
  const routePath = normalizeRoutePath(
    args.relativePath || path.relative(args.projectDir, args.filePath),
  );

  return routePath || '/' + path.basename(args.filePath);
}

export function normalizeSidecarRoutePath(args: NormalizeRoutePathArgs) {
  if (args.routePath.startsWith('source://@')) {
    return normalizeRoutePath(args.routePath.slice('source://'.length));
  }

  try {
    const url = new URL(args.routePath, 'http://127.0.0.1');
    return normalizeRoutePath(url.pathname);
  } catch {
    return normalizeRoutePath(args.routePath);
  }
}

export function createSourceUrl(args: CreateSourceUrlArgs) {
  return `http://${args.host}:${args.port}${encodeURI(args.routePath)}`;
}

export function getRequestPathname(url: string | undefined) {
  if (!url) return null;

  try {
    return decodeURI(new URL(url, 'http://127.0.0.1').pathname);
  } catch {
    return null;
  }
}

export function readCachedPort(args: ReadCachedPortArgs) {
  try {
    const file = JSON.parse(readFileSync(args.filePath, 'utf8')) as { port?: unknown; };
    const port = file.port;
    return typeof port === 'number' && Number.isInteger(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

export function writeCachedPort(args: WriteCachedPortArgs) {
  try {
    mkdirSync(path.dirname(args.filePath), { recursive: true });
    writeFileSync(args.filePath, JSON.stringify({ port: args.port }), 'utf8');
  } catch {
    // The sidecar still works if the sticky-port cache cannot be written.
  }
}

export function isPortUnavailableError(args: IsPortUnavailableErrorArgs) {
  if (!(args.error instanceof Error)) return false;

  const code = (args.error as NodeJS.ErrnoException).code;
  return code === 'EADDRINUSE' || code === 'EACCES';
}

function normalizeRoutePath(filePath: string) {
  const normalized = filePath
    .replace(/\\/g, '/')
    .replace(/^(\.\.\/)+/, '')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/');

  return normalized ? `/${normalized}` : '';
}
