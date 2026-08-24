export type CompilerCssPropOptions = {
  adapter: string;
};

const CssPropSolid: CompilerCssPropOptions = {
  adapter: '@fluentic/style/adapter/solid',
};

const CssPropPreact: CompilerCssPropOptions = {
  adapter: '@fluentic/style/adapter/preact',
};

const CssPropReact: CompilerCssPropOptions = {
  adapter: '@fluentic/style/adapter/react',
};

export const CssPropPresets = {
  Solid: CssPropSolid,
  Preact: CssPropPreact,
  React: CssPropReact,
};
