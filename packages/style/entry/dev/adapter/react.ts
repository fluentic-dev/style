import { createMergeJsxProps } from '../../../runtime/adapter/utils';
import { getClassName } from '../../../runtime/core/getClassName';

export const mergeJsxProps = createMergeJsxProps(getClassName, {
  classProp: 'className',
  styleProp: 'style',
  styleMode: 'react',
});
