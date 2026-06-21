import React from 'react';
import { createRoot } from 'react-dom/client';
import { BundlerSampleApp } from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BundlerSampleApp bundler='Parcel 2' />
  </React.StrictMode>,
);

