import { FLUENTIC_SIDECAR_URL_SYMBOL_KEY, setBuildMeta } from '../../../config/build';
import type { BuildMeta } from '../../../config/build';

export function setupNextRuntime(options: {
  rsc: boolean;
}) {
  const sidecarUrl = process.env.FLUENTIC_STYLE_NEXT_SIDECAR_URL;
  if (sidecarUrl) {
    (globalThis as Record<symbol, unknown>)[
      Symbol.for(FLUENTIC_SIDECAR_URL_SYMBOL_KEY)
    ] = sidecarUrl;
  }

  setBuildMeta({
    ...getBuildMeta(),
    rsc: options.rsc,
  });
}

function getBuildMeta(): BuildMeta {
  const raw = process.env.FLUENTIC_STYLE_NEXT_BUILD_META;

  if (!raw) {
    throw new Error(
      '[fluentic-style] Next.js runtime setup is missing FLUENTIC_STYLE_NEXT_BUILD_META. Make sure the Fluentic Next.js plugin is registered.',
    );
  }

  try {
    return JSON.parse(raw) as BuildMeta;
  } catch {
    throw new Error(
      '[fluentic-style] Next.js runtime setup received invalid FLUENTIC_STYLE_NEXT_BUILD_META.',
    );
  }
}
