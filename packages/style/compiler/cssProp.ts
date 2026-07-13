export type CompilerCssPropStyleMode = 'react' | 'solid';

export type CompilerCssPropOptions = {
  classProp: 'class' | 'className';
  styleProp: 'style';
  styleMode: CompilerCssPropStyleMode;
  adapter: string;
};

export const CssPropSolid: CompilerCssPropOptions = {
  classProp: 'class',
  styleProp: 'style',
  styleMode: 'solid',
  adapter: '@fluentic/style/adapter/solid',
};

export const CssPropReact: CompilerCssPropOptions = {
  classProp: 'className',
  styleProp: 'style',
  styleMode: 'react',
  adapter: '@fluentic/style/adapter/react',
};

export const CssPropPresets = {
  Solid: CssPropSolid,
  React: CssPropReact,
};
