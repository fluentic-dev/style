import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { formatError } from '../misc';
import { getRequestPathname, isPortUnavailableError, readCachedPort, writeCachedPort } from './utils';

export const SIDECAR_HOST = '127.0.0.1';

export type CreateSidecarServerArgs = {
  projectDir: string;
  routes: Map<string, string>;
  handlers?: Map<string, SidecarRouteHandler>;
};

export type SidecarRouteResponse = {
  body: string | Buffer;
  contentType?: string;
};

export type SidecarRouteHandler = () => SidecarRouteResponse | null | Promise<SidecarRouteResponse | null>;

export type StartSidecarServerArgs = {
  host?: string;
  portFilePath: string;
  server: Server;
};

export function createSidecarServer(args: CreateSidecarServerArgs) {
  return createServer(async (req, res) => {
    const pathname = getRequestPathname(req.url);
    const handler = pathname ? args.handlers?.get(pathname) : null;

    if (handler) {
      const response = await handler();

      if (!response) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', response.contentType ?? 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      res.statusCode = 200;
      res.end(response.body);
      return;
    }

    const filePath = pathname
      ? args.routes.get(pathname) ?? getProjectSourcePath(args.projectDir, pathname)
      : null;

    if (!filePath || !existsSync(filePath)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.statusCode = 200;
    res.end(readFileSync(filePath, 'utf8'));
  });
}

function getProjectSourcePath(projectDir: string, pathname: string) {
  const sourcePath = pathname
    .replace(/^\/+/, '')
    .replace(/^@\/?/, '');

  if (!sourcePath || sourcePath.startsWith('..')) return null;

  const filePath = path.resolve(projectDir, sourcePath);
  const projectPath = path.resolve(projectDir);

  return filePath === projectPath || filePath.startsWith(projectPath + path.sep)
    ? filePath
    : null;
}

export async function startSidecarServer(args: StartSidecarServerArgs) {
  const host = args.host ?? SIDECAR_HOST;
  const cachedPort = readCachedPort({ filePath: args.portFilePath });

  if (cachedPort !== null) {
    try {
      return await listen({ server: args.server, host, port: cachedPort });
    } catch (error) {
      if (!isPortUnavailableError({ error })) throw error;
    }
  }

  const port = await listen({ server: args.server, host, port: 0 });

  writeCachedPort({ filePath: args.portFilePath, port });

  return port;
}

type ListenArgs = {
  host: string;
  port: number;
  server: Server;
};

function listen(args: ListenArgs) {
  return new Promise<number>((resolve, reject) => {
    const cleanup = () => {
      args.server.off('error', onError);
      args.server.off('listening', onListening);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onListening = () => {
      cleanup();

      const address = args.server.address();

      if (
        !address ||
        typeof address !== 'object' ||
        typeof address.port !== 'number'
      ) {
        reject(new Error(formatError('Sourcemap sidecar server started without a TCP port.')));
        return;
      }

      resolve(address.port);
    };

    args.server.once('error', onError);
    args.server.once('listening', onListening);
    args.server.listen(args.port, args.host);
  });
}
