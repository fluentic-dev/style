export const symbol = <T extends string>(name: T) => Symbol.for(`fluentic-style.${name}`);
