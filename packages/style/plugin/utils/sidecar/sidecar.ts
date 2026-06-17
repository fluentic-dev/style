import type { Server } from 'node:http';
import path from 'node:path';
import { globalData } from '../../../utils/global';
import { formatError } from '../misc';
import { createSidecarServer, SIDECAR_HOST, type SidecarRouteHandler, startSidecarServer } from './server';
import { createSourceUrl, getPortFilePath, getRoutePath, normalizeSidecarRoutePath } from './utils';

type SidecarServer = {
  cacheDir: string;
  handlers: Map<string, SidecarRouteHandler>;
  projectDir: string;
  port: number | null;
  portFilePath: string;
  routes: Map<string, string>;
  server: Server;
  startError: Error | null;
  startPromise: Promise<void>;
};

export type SourcemapSidecar = {
  cacheDir: string;
  projectDir: string;
  ensureStarted(): Promise<void>;
  getBaseUrl(): string | null;
  getRouteUrl(routePath: string): string;
  getSourceUrl(filePath: string, relativePath?: string | null): string;
  registerSource(filePath: string, routePath: string): string;
  registerRoute(routePath: string, handler: SidecarRouteHandler): string;
};

export type SourcemapSidecarArgs = {
  cacheDir: string;
  projectDir: string;
  routes?: Record<string, SidecarRouteHandler>;
};

const sidecarServers = globalData(
  'plugin.sidecar.servers',
  () => new Map<string, SidecarServer>(),
);

export function getSourcemapSidecar(args: SourcemapSidecarArgs): SourcemapSidecar {
  const normalizedProjectDir = path.resolve(args.projectDir);
  const normalizedCacheDir = path.resolve(args.cacheDir);
  const state = getOrCreateServer(normalizedProjectDir, normalizedCacheDir);

  if (args.routes) {
    for (const [routePath, handler] of Object.entries(args.routes)) {
      state.handlers.set(normalizeSidecarRoutePath({ routePath }), handler);
    }
  }

  return {
    cacheDir: normalizedCacheDir,
    projectDir: normalizedProjectDir,
    ensureStarted() {
      return state.startPromise;
    },
    getBaseUrl() {
      return createSidecarBaseUrl(state);
    },
    getRouteUrl(routePath) {
      return createSidecarSourceUrl(
        state,
        normalizeSidecarRoutePath({ routePath }),
      );
    },
    getSourceUrl(filePath, relativePath) {
      return createSidecarSourceUrl(
        state,
        getRoutePath({
          filePath,
          projectDir: normalizedProjectDir,
          relativePath,
        }),
      );
    },
    registerSource(filePath, routePath) {
      routePath = normalizeSidecarRoutePath({ routePath });

      state.routes.set(routePath, path.resolve(filePath));

      return createSidecarSourceUrl(state, routePath);
    },
    registerRoute(routePath, handler) {
      routePath = normalizeSidecarRoutePath({ routePath });

      state.handlers.set(routePath, handler);

      return createSidecarSourceUrl(state, routePath);
    },
  };
}

function createSidecarBaseUrl(state: SidecarServer) {
  if (state.startError || state.port === null) return null;

  return `http://${SIDECAR_HOST}:${state.port}`;
}

function createSidecarSourceUrl(state: SidecarServer, routePath: string) {
  if (state.startError) {
    throw new Error(formatError(
      `The sourcemap dev server could not start: ${state.startError.message}`,
    ));
  }

  if (state.port === null) {
    throw new Error(formatError(
      'The sourcemap dev server is not ready yet. Try rebuilding after the dev server finishes starting.',
    ));
  }

  const baseUrl = createSidecarBaseUrl(state);

  if (baseUrl === null) {
    throw new Error(formatError(
      'The sourcemap dev server is not ready yet. Try rebuilding after the dev server finishes starting.',
    ));
  }

  return createSourceUrl({
    baseUrl,
    routePath,
  });
}

function getOrCreateServer(projectDir: string, cacheDir: string) {
  const servers = sidecarServers;

  const existing = servers.get(cacheDir);
  if (existing) return existing;

  const routes = new Map<string, string>();
  const handlers = new Map<string, SidecarRouteHandler>();

  const state: SidecarServer = {
    cacheDir,
    handlers,
    projectDir,
    port: null,
    portFilePath: getPortFilePath({ cacheDir }),
    routes,
    server: createSidecarServer({ projectDir, routes, handlers }),
    startError: null,
    startPromise: Promise.resolve(),
  };

  state.startPromise = startServer(state).catch((error: Error) => {
    state.startError = error;
    throw error;
  });

  state.startPromise.catch(() => {});
  state.server.unref();
  servers.set(cacheDir, state);

  return state;
}

async function startServer(state: SidecarServer) {
  state.port = await startSidecarServer({
    host: SIDECAR_HOST,
    portFilePath: state.portFilePath,
    server: state.server,
  });
}
