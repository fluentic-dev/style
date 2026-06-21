import { CompilerRuntimeMode, type CompilerCssOptions, type CompilerDevOptions } from '../../compiler';
import type { BuildConfig, BuildDevConfig } from '../../config/build';
import type { PluginOptions } from './compiler';

export function getStyleRuntimeMode(dev: boolean, rsc = false): CompilerRuntimeMode {
  if (rsc) {
    return dev ? CompilerRuntimeMode.RscDev : CompilerRuntimeMode.RscProd;
  }

  return dev ? CompilerRuntimeMode.Dev : CompilerRuntimeMode.Prod;
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
  sidecarUrl: string | null,
  stringify = true,
) {
  const defines: Record<string, string> = {
    FLUENTIC_STYLE_BUILD_CONFIG: JSON.stringify(buildConfig),
    FLUENTIC_STYLE_DEV_CONFIG: JSON.stringify(buildDevConfig ?? {}),
    FLUENTIC_STYLE_SIDECAR_SERVER_URL: sidecarUrl ?? '',
  };

  if (stringify) {
    Object.keys(defines).forEach((key) => {
      defines[key] = JSON.stringify(defines[key]);
    });
  }

  return defines;
}
