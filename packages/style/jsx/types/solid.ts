declare module 'solid-js/types/jsx' {
  namespace JSX {
    interface RuntimeAttributes {
      css?: import('../../runtime/types').StyleProp;
    }

    interface HTMLAttributes<_T> extends RuntimeAttributes {}
    interface SVGAttributes<_T> extends RuntimeAttributes {}
  }
}

declare module 'solid-js/jsx-runtime' {
  namespace JSX {
    interface RuntimeAttributes {
      css?: import('../../runtime/types').StyleProp;
    }

    interface HTMLAttributes<_T> extends RuntimeAttributes {}
    interface SVGAttributes<_T> extends RuntimeAttributes {}
  }
}

declare module 'solid-js' {
  namespace JSX {
    interface RuntimeAttributes {
      css?: import('../../runtime/types').StyleProp;
    }

    interface HTMLAttributes<_T> extends RuntimeAttributes {}
    interface SVGAttributes<_T> extends RuntimeAttributes {}
  }
}
