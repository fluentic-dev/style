import {
  createParcelRuntimeModuleSource,
  ensureParcelSidecarStarted,
  getParcelState,
  Runtime,
  writeParcelRuntimeFile,
} from './shared';

export default new Runtime({
  async apply({ bundle, options }: any) {
    if (bundle.type !== 'js') return;

    const current = getParcelState(options);
    await ensureParcelSidecarStarted(current);
    const code = createParcelRuntimeModuleSource(current);

    return {
      filePath: writeParcelRuntimeFile(current, code),
      code,
      isEntry: true,
    };
  },
});
