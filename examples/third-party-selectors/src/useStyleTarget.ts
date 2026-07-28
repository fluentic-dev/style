import { createStyleTarget } from '@fluentic/style/css';
import { useEffect, useState } from 'react';

export function useStyleTarget() {
  const [target] = useState(() => createStyleTarget());

  useEffect(() => {
    return () => {
      target.destroy();
    };
  }, [target]);

  return target;
}
