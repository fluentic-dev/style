import { createRollupStylePlugin } from '../utils/rollup';
import type { RollupStylePluginOptions } from '../utils/rollup';

export type { RollupStylePluginOptions as PluginOptions };

export default plugin;

export function plugin(options: RollupStylePluginOptions = {}) {
  return createRollupStylePlugin(options);
}
