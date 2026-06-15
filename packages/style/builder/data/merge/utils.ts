import { RUNTIME_CONFIG } from '../../../config';
import { traceError } from '../../../utils/trace';
import { BUILDER_STATE, ITEM_RUNTIME_DEV, ITEM_RUNTIME_DEV_PLUGIN, ITEM_RUNTIME_PROD } from '../const';
import type { BuilderData } from '../data';
import type { DebugData } from '../debug';

export function cloneData<Data extends BuilderData, Source extends BuilderData>(
  data: Data,
  source: Source,
  debug: DebugData | null,
  merge = true,
) {
  const runtimeType = RUNTIME_CONFIG.isDev
    ? (debug ? ITEM_RUNTIME_DEV_PLUGIN : ITEM_RUNTIME_DEV)
    : ITEM_RUNTIME_PROD;

  const state = data[BUILDER_STATE];

  state.items = merge ? source[BUILDER_STATE].items.slice() : [];

  state.lookup = Object.assign(
    Object.create(null),
    merge ? source[BUILDER_STATE].lookup : null,
  );

  const lookup = state.lookup!;
  const items = state.items;

  return [runtimeType, data, items, lookup] as const;
}

export function logInvalidData(message: string, data: object) {
  console.log(traceError(message), 'data:', data);
}
