import { useState } from 'react';
import { EventFeed } from './components/EventFeed';
import { Hero } from './components/Hero';
import { Plans } from './components/Plans';
import { themeOptions } from './components/theme';
import { cx } from './style';

export function App() {
  const [themeIndex, setThemeIndex] = useState(0);

  const activeTheme = themeOptions[themeIndex].theme;

  return (
    <main
      css={[
        activeTheme,
        cx(
          'min-h-screen',
          'bg-canvas',
          'text-fg',
          'text-base',
          '[font-family:Inter,_ui-sans-serif,_system-ui,_sans-serif]',
          'overflow-x-hidden',
        ),
      ]}
    >
      <div
        css={cx(
          'w-content',
          'mx-auto',
          'p-6',
          'py-6',
        ).md('py-8')}
      >
        <Hero
          themeOptions={themeOptions}
          themeIndex={themeIndex}
          onThemeChange={setThemeIndex}
        />
        <Plans />
        <EventFeed />
      </div>
    </main>
  );
}
