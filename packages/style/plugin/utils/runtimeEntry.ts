import { rewriteImportSources } from '../../compiler/transform/utils/import';
import type { CompilerCssOptions, CompilerDevOptions } from '../../compiler';
import type { BuildConfig, BuildDevConfig } from '../../config/build';
import {
  getStyleRuntimeCssImportPath,
  getStyleRuntimeImportPath,
  STYLE_IMPORTS,
} from './imports';
import type { PluginOptions } from './compiler';

export enum StyleRuntimeMode {
  Dev = 'dev',
  Prod = 'prod',
  RscDev = 'rsc-dev',
  RscProd = 'rsc-prod',
}

export function getStyleRuntimeMode(dev: boolean, rsc = false): StyleRuntimeMode {
  if (rsc) {
    return dev ? StyleRuntimeMode.RscDev : StyleRuntimeMode.RscProd;
  }

  return dev ? StyleRuntimeMode.Dev : StyleRuntimeMode.Prod;
}

export function getPluginBuildConfig(options: PluginOptions): BuildConfig {
  const css: CompilerCssOptions = hasBuildConfig(options.css) ? options.css! : {};

  return {
    hoist: options.hoist !== false,
    css,
  };
}

export function getPluginBuildDevConfig(options: PluginOptions): BuildDevConfig | null {
  const devConfig: BuildDevConfig | null = hasBuildConfig(options.dev) ? options.dev! : null;

  return devConfig;
}

function hasBuildConfig(config: CompilerCssOptions | CompilerDevOptions | null | undefined) {
  if (!config) return false;

  for (const key in config) {
    if (config[key as keyof typeof config] !== undefined) return true;
  }

  return false;
}

export function getStyleEntryDefines(
  buildConfig: BuildConfig,
  buildDevConfig: BuildDevConfig | null,
  dev: boolean,
  sidecarUrl?: string | null,
) {
  return {
    FLUENTIC_STYLE_BUILD_CONFIG: JSON.stringify(JSON.stringify(buildConfig)),
    ...(dev
      ? {
        FLUENTIC_STYLE_DEV_CONFIG: JSON.stringify(JSON.stringify(buildDevConfig ?? {})),
        FLUENTIC_STYLE_SIDECAR_SERVER_URL: JSON.stringify(sidecarUrl ?? ''),
      }
      : {}),
  };
}

export function getRuntimeImportAliases(dev: boolean) {
  const runtimeMode = dev ? StyleRuntimeMode.Dev : StyleRuntimeMode.Prod;
  const aliases: Record<string, string> = {};

  aliases[STYLE_IMPORTS.Root] = getStyleRuntimeImportPath(runtimeMode);

  return aliases;
}

export function getServerRuntimeImportAliases(dev: boolean) {
  const runtimeMode = dev ? StyleRuntimeMode.RscDev : StyleRuntimeMode.RscProd;

  const aliases: Record<string, string> = {
    [STYLE_IMPORTS.Root]: getStyleRuntimeImportPath(runtimeMode),
  };

  return aliases;
}

export function rewriteStyleRuntimeImports(
  code: string,
  mode: StyleRuntimeMode | null | undefined,
  filePath: string,
) {
  if (!mode) return code;

  return rewriteImportSources(
    code,
    (source) => getRuntimeImportSource(source, mode),
    filePath,
  );
}

function getRuntimeImportSource(source: string, mode: StyleRuntimeMode) {
  if (source === STYLE_IMPORTS.Root) return getStyleRuntimeImportPath(mode);
  if (source === STYLE_IMPORTS.Css) return getStyleRuntimeCssImportPath(mode);

  return null;
}
