import type { RuntimeStyleAttributes } from '../../runtime/types';

interface RuntimeAttributes extends RuntimeStyleAttributes {}

declare module 'react' {
  interface HTMLAttributes<T> extends RuntimeAttributes {}
  interface SVGAttributes<T> extends RuntimeAttributes {}
}
