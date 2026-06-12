declare module '*?worker' {
  const WorkerFactory: {
    new(options?: WorkerOptions): Worker;
  };
  export default WorkerFactory;
}

interface ImportMetaEnv {
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const css: string;
  export default css;
}

declare module '@babel/standalone' {
  export const transform: (code: string, options?: Record<string, unknown>) => { code?: string | null; };

  export type NodePath<T = unknown> = {
    node: T;
  };

  export namespace types {
    type Node = any;
    type ImportDeclaration = any;
    type VariableDeclarator = any;
    type ExportNamedDeclaration = any;
  }
}
