import { createMergeJsxProps } from '../../../runtime/adapter/utils';
import { getClassName } from '../../../runtime/rsc/getClassName';

export const mergeJsxProps = createMergeJsxProps(getClassName, {
  classProp: 'class',
  styleProp: 'style',
  styleMode: 'solid',
  preserveResultProps: true,
});
