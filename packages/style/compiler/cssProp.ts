export type CompilerCssPropStyleMode = 'react' | 'solid';

export type CompilerCssPropOptions = {
  classProp: 'class' | 'className';
  styleProp: 'style';
  styleMode: CompilerCssPropStyleMode;
  adapter: string;
};

const CssPropSolid: CompilerCssPropOptions = {
  classProp: 'class',
  styleProp: 'style',
  styleMode: 'solid',
  adapter: '@fluentic/style/adapter/solid',
};

const CssPropPreact: CompilerCssPropOptions = {
  classProp: 'class',
  styleProp: 'style',
  styleMode: 'react',
  adapter: '@fluentic/style/adapter/preact',
};

const CssPropReact: CompilerCssPropOptions = {
  classProp: 'className',
  styleProp: 'style',
  styleMode: 'react',
  adapter: '@fluentic/style/adapter/react',
};

export const CssPropPresets = {
  Solid: CssPropSolid,
  Preact: CssPropPreact,
  React: CssPropReact,
};
