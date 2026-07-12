export function symbol<T extends symbol>(name: string): T {
  return Symbol.for(`@fluentic/style.${name}`) as T;
}
