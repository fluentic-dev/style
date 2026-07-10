import { useState } from 'react';
import { EventFeed } from './components/EventFeed';
import { Hero } from './components/Hero';
import { Plans } from './components/Plans';
import { themeOptions } from './components/theme';
import { tw } from './style';

export function App() {
  const [themeIndex, setThemeIndex] = useState(0);

  const activeTheme = themeOptions[themeIndex].theme;

  return (
    <main
      css={[
        activeTheme,
        tw({
          minH: '$screen',
          bg: '$canvas',
          text: '$text',
          textSize: '$base',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          overflowX: 'hidden',
        }),
      ]}
    >
      <div
        css={tw({
          w: '$content',
          mx: 'auto',
          p: '$6',
          py: '$6',
        }).md({
          py: '$8',
        })}
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
