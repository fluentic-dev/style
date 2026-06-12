import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './global.css';

export const metadata: Metadata = {
  title: {
    default: 'Fluentic Style',
    template: '%s | Fluentic Style',
  },
  description: 'Runtime-first atomic CSS-in-JS for React component systems.',
};

export default function RootLayout({ children }: { children: ReactNode; }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

