import { LayerPlaceholder } from '../../atomic/layer';
import type { BuildCssConfig } from '../../config';
import type { StyleFn } from '../../style';
import type { CssExtractRule } from '../extract';
import type { BabelTransformSourceMap } from '../transform/utils/babel';
import type { ImportSource } from '../utils/import_source';
import type { GetSourcemapFilePathFn } from '../utils/sourcemap';

export const CompilerConstants = {
  LayerPlaceholder,
};

export const Constants = CompilerConstants;

export type CompilerCssOptions = BuildCssConfig & {
  layer?: boolean;
};

export type CompilerOptions = {
  styleFn?: StyleFn;
  css?: CompilerCssOptions;

  importSources?: ImportSource[];

  getSourcemapFilePath?: GetSourcemapFilePathFn;
  devSourcemap?: 'sourceUrl' | 'sidecarServer' | 'sourceContent';
};

export type TransformDebugArgs = {
  code: string;
  sourcemap: BabelTransformSourceMap;
  filePath: string;
};

export type TransformDebugResult = {
  code: string;
  sourcemap: string | null;
};

export type TransformDebugRscResult = TransformDebugResult & {
  css: string;
  rules: CssExtractRule[];
};

export type TransformExtractArgs = {
  code: string;
  sourcemap: BabelTransformSourceMap;
  filePath: string;
};

export type TransformExtractResult = {
  code: string;
  rules: CssExtractRule[];
  sourcemap: string | null;
};

export type CompilerInvalidateFileInfo = {
  filePath: string;
};
