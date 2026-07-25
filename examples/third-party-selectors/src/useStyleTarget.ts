import { createStyleTarget } from '@fluentic/style/css';
import { useEffect, useRef, useState } from 'react';

export function useStyleTarget() {
  const [target] = useState(() => createStyleTarget());
  const destroyTimer = useRef<number | null>(null);

  useEffect(() => {
    if (destroyTimer.current !== null) {
      window.clearTimeout(destroyTimer.current);
      destroyTimer.current = null;
    }

    return () => {
      destroyTimer.current = window.setTimeout(() => {
        target.destroy();
        destroyTimer.current = null;
      });
    };
  }, [target]);

  return target;
}
