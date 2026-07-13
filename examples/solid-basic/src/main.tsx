import { enableStyleDevUtils } from '@fluentic/style/dev';
import { render } from 'solid-js/web';
import { Page } from './page';

if (import.meta.env.DEV) {
  enableStyleDevUtils();
}

render(() => <Page /> as any, document.getElementById('root')!);
