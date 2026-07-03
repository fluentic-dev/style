import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './global.css';

const basePath = process.env.NEXT_PUBLIC_DOCS_BASE ?? '';

export const metadata: Metadata = {
  title: {
    default: 'Fluentic Style',
    template: '%s | Fluentic Style',
  },
  description: 'Component Style Composition for React.',
  icons: {
    icon: `${basePath}/logo.png`,
    shortcut: `${basePath}/logo.png`,
    apple: `${basePath}/logo.png`,
  },
};

export default function RootLayout({ children }: { children: ReactNode; }) {
  return (
    <html lang='en' data-scroll-behavior='smooth' suppressHydrationWarning>
      <body>
        <RootProvider search={{ options: { type: 'static', api: `${basePath}/api/search` } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
