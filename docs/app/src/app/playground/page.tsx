import PlaygroundApp from '@docs/playground';
import './playground-page.css';

export const metadata = {
  title: 'Playground',
  description: 'Interactive Fluentic Style playground. Edit tokens, slots, and themes in real time.',
};

export default function PlaygroundPage() {
  const basePath = process.env.NEXT_PUBLIC_DOCS_BASE ?? '';
  return (
    <main className='playground-page'>
      <PlaygroundApp docsUrl={`${basePath}/docs/`} logoUrl={`${basePath}/logo.png`} />
    </main>
  );
}
