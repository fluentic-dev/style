import { enableStyleDevUtils } from '@fluentic/style/dev';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeApp } from './App';
import './reset.css';

if (import.meta.env.DEV) {
  enableStyleDevUtils();
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeApp />
  </React.StrictMode>,
);
