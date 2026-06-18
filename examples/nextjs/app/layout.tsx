import { StyleDev } from '@fluentic/style/dev/rsc';
import type { Metadata } from 'next';
import { type ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Fluentic Style + Next.js',
  description: 'Next.js App Router example for @fluentic/style extraction.',
};

export default function RootLayout(props: { children: ReactNode; }) {
  return (
    <html lang='en'>
      <body>{props.children}</body>

      {process.env.NODE_ENV === 'development' && <StyleDev enableStyleDevUtils />}
    </html>
  );
}
