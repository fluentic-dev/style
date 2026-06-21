import { EXTRACTED_CSS_MARKER } from '../../utils';
import { CSS_MODULE_ID, isVirtualModuleRequest, loadVirtualModule, RUNTIME_MODULE_ID } from '../../utils/virtual';
import {
  ensureParcelSidecarStarted,
  getParcelState,
  Resolver,
  writeParcelCssFile,
  writeParcelVirtualRuntimeFile,
} from './shared';

export default new Resolver({
  async resolve({ specifier, options }: any) {
    if (
      !isVirtualModuleRequest(specifier, RUNTIME_MODULE_ID) &&
      !isVirtualModuleRequest(specifier, CSS_MODULE_ID)
    ) {
      return null;
    }

    const current = getParcelState(options);
    await ensureParcelSidecarStarted(current);

    const isCss = isVirtualModuleRequest(specifier, CSS_MODULE_ID);
    const code = isCss
      ? EXTRACTED_CSS_MARKER
      : loadVirtualModule(specifier, !current.dev, CSS_MODULE_ID);
    const filePath = isCss
      ? writeParcelCssFile(current)
      : writeParcelVirtualRuntimeFile(current, code ?? '');

    return {
      filePath,
      sideEffects: true,
    };
  },
});
