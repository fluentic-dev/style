import 'preact';

declare module 'preact' {
  namespace JSX {
    interface FluenticRuntimeAttributes {
      css?: import('../../runtime/types').StyleProp;
    }

    interface HTMLAttributes<RefType extends EventTarget = EventTarget> extends FluenticRuntimeAttributes {}
    interface SVGAttributes<Target extends EventTarget = SVGElement> extends FluenticRuntimeAttributes {}
  }
}
