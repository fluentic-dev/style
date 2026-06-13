import { plugin as webpackPlugin } from '../webpack';
import type { PluginOptions } from '../webpack';

export type { PluginOptions };

export default plugin;

export function plugin(options: PluginOptions = {}) {
  return {
    apply(compiler: unknown) {
      webpackPlugin(options).apply(compiler as never);
    },
  };
}
