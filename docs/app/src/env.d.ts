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
