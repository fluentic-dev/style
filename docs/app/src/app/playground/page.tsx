import PlaygroundApp from '#playground/PlaygroundApp';
import './playground-page.css';

export const metadata = {
  title: 'Playground',
  description: 'Interactive Fluentic Style playground. Edit tokens, slots, and themes in real time.',
};

export default function PlaygroundPage() {
  return (
    <main className="playground-page">
      <PlaygroundApp />
    </main>
  );
}

