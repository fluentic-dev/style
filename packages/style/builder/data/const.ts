import { symbol } from '../../utils/const';

export const BUILDER_TYPE: unique symbol = symbol('builder.type');
export const BUILDER_STATE: unique symbol = symbol('builder.state');
export const BUILDER_CALLSITE: unique symbol = symbol('builder.callsite');
export const BUILDER_SLOT_ID: unique symbol = symbol('builder.slotId');
export const BUILDER_SCOPE_ID: unique symbol = symbol('builder.scopeId');
export const BUILDER_SCOPE: unique symbol = symbol('builder.scope');

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
export const ITEM_VALUE_NUMBER_PX = 1;
