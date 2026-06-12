import { setBuildMeta } from '../../../config/build';
import type { BuildMeta } from '../../../config/build';

setBuildMeta(getBuildMeta());

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
