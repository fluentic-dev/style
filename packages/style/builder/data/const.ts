import { symbol } from '../../utils/const';

export const BUILDER_TYPE: unique symbol = symbol('builder.type') as typeof BUILDER_TYPE;
export const BUILDER_STATE: unique symbol = symbol('builder.state') as typeof BUILDER_STATE;
export const BUILDER_CALLSITE: unique symbol = symbol('builder.callsite') as typeof BUILDER_CALLSITE;
export const BUILDER_SLOT_ID: unique symbol = symbol('builder.slotId') as typeof BUILDER_SLOT_ID;
export const BUILDER_SCOPE_ID: unique symbol = symbol('builder.scopeId') as typeof BUILDER_SCOPE_ID;
export const BUILDER_SCOPE: unique symbol = symbol('builder.scope') as typeof BUILDER_SCOPE;

export const BUILDER_TYPE_STYLE = 1;
export const BUILDER_TYPE_SLOT = 2;
export const BUILDER_TYPE_SLOT_OVERRIDE = 3;
export const BUILDER_TYPE_SCOPE = 4;
export const BUILDER_TYPE_SCOPE_TARGET = 5;
export const BUILDER_TYPE_THEME = 6;

export const ITEM_RUNTIME_DEV = -1;
export const ITEM_RUNTIME_DEV_PLUGIN = -2;
export const ITEM_RUNTIME_PROD = -3;
export const ITEM_RUNTIME_PROD_PLUGIN = -4;

export const ITEM_VALUE_TYPE_VARIABLE = 1;
export const ITEM_VALUE_TYPE_STYLE_DATA = 2;
