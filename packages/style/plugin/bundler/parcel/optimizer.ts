import { EXTRACTED_CSS_MARKER } from '../../utils';
import { replaceCssMarker } from '../../utils/cssMarker';
import { ensureParcelSidecarStarted, getParcelExtractedCss, getParcelState, Optimizer } from './shared';

export default new Optimizer({
  async optimize({ bundle, contents, map, options }: any) {
    if (bundle.type !== 'css') {
      return { contents, map };
    }

    const current = getParcelState(options);
    await ensureParcelSidecarStarted(current);

    const css = getParcelExtractedCss(current);
    if (!css) return { contents, map };

    const text = typeof contents === 'string'
      ? contents
      : Buffer.isBuffer(contents)
      ? contents.toString('utf8')
      : null;

    if (text === null) return { contents, map };

    return {
      contents: text.includes(EXTRACTED_CSS_MARKER)
        ? replaceCssMarker(text.split(EXTRACTED_CSS_MARKER)[0] + EXTRACTED_CSS_MARKER, css)
        : text + '\n' + css,
      map,
    };
  },
});
