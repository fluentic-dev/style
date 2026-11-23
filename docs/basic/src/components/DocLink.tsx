import Link from '@docusaurus/Link';
import type { ReactNode } from 'react';

export default function DocLink({ path, children }: { path: string; children: ReactNode; }) {
  return <Link to={path}>{children}</Link>;
}
