import { enableStyleDevUtils } from '@fluentic/style/dev';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Page } from './page';

if (import.meta.env.DEV) {
  enableStyleDevUtils();
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
);
