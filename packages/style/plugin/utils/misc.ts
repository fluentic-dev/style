import { PLUGIN_NAME } from './constants';

export function globalSymbol<T extends string>(name: T) {
  return Symbol.for(`@fluentic/style.${name}`);
}

export function formatError(msg: string) {
  return `[${PLUGIN_NAME}] ${msg}`;
}
