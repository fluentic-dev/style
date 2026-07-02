import { enableBundlerDevUtils } from '@example/bundler-shared/runtime';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BundlerSampleApp } from './App';

enableBundlerDevUtils();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BundlerSampleApp bundler='Vite 8' />
  </React.StrictMode>,
);
