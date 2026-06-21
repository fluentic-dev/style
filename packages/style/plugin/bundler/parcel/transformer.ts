import { DEFAULT_TRANSFORM_INCLUDE_PATTERN } from '../../utils';
import { createFileCssContentHash } from '../../utils/cache';
import { parseBundlerSourceMap } from '../../utils/sourcemap';
import {
  createParcelError,
  ensureParcelSidecarStarted,
  getParcelState,
  isParcelGeneratedRuntimeFile,
  prependParcelRuntimeImport,
  replaceParcelDefines,
  Transformer,
  writeParcelCssFile,
} from './shared';

const TRANSFORM_INCLUDE_REGEX = new RegExp(DEFAULT_TRANSFORM_INCLUDE_PATTERN);

export default new Transformer({
  async transform({ asset, options }: any) {
    const current = getParcelState(options);
    await ensureParcelSidecarStarted(current);

    const code = await asset.getCode();
    const filePath = asset.filePath;
    const maybeMap = await asset.getMap();
    const sourcemap = maybeMap?.toVLQ ? maybeMap.toVLQ() : maybeMap;

    let nextCode = code;

    if (TRANSFORM_INCLUDE_REGEX.test(filePath)) {
      try {
        const result = current.transform(
          code,
          filePath,
          parseBundlerSourceMap(toSourceMapString(sourcemap)),
        );

        if (result) {
          const rules = Array.isArray(result.rules) ? result.rules : [];

          nextCode = result.code;
          current.cssCache.setFileCss({
            filePath,
            contentHash: createFileCssContentHash(code),
            configHash: current.cssConfigHash,
            rules,
          });
          writeParcelCssFile(current);
        }
      } catch (error) {
        throw createParcelError(error);
      }
    }

    nextCode = replaceParcelDefines(nextCode, current);
    if (!isParcelGeneratedRuntimeFile(current, filePath)) {
      nextCode = prependParcelRuntimeImport(nextCode, current, filePath);
    }
    asset.setCode(nextCode);

    return [asset];
  },
});

function toSourceMapString(map: unknown) {
  if (!map) return null;
  return typeof map === 'string' ? map : JSON.stringify(map);
}
