import { configureRuntime } from '@fluentic/style';
import { enableStyleDevUtils } from '@fluentic/style/dev';
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { cases, type SelectorCase } from './selector-cases';
import './styles.css';

type CaseResult = {
  name: string;
  code: string;
  status: 'pass' | 'fail';
  expectation: string;
  message: string;
  stack: string;
};

if (import.meta.env.DEV) {
  configureRuntime({ dev: true });
  enableStyleDevUtils();
}

function App() {
  const [result, setResult] = useState<CaseResult | null>(null);
  const groups = useMemo(() => groupCases(cases), []);
  const modeLabel = getModeLabel();

  return (
    <main className='app-shell'>
      <section className='toolbar'>
        <div>
          <p className='eyebrow'>Selector check</p>
          <h1>Runtime selector validation cases</h1>
          <p className='mode-note'>{modeLabel}</p>
        </div>
        <button
          className='run-all'
          onClick={() => {
            const results = cases.map(runCase);
            setResult(
              results.find((item) => item.status === 'fail') ?? {
                name: 'All cases',
                status: 'pass',
                expectation: 'all expectations matched',
                code: '',
                message: 'Every case behaved as expected.',
                stack: '',
              },
            );
          }}
        >
          Run all cases
        </button>
      </section>

      <section className='case-grid'>
        {groups.map((group) => (
          <div className='case-group' key={group.name}>
            <h2>{group.name}</h2>
            <div className='case-list'>
              {group.items.map((item) => (
                <button
                  className={'case-button ' + (item.expectError ? 'expect-error' : 'expect-pass')}
                  key={item.name}
                  onClick={() => setResult(runCase(item))}
                >
                  <span className='case-button-header'>
                    <span>{item.name}</span>
                    <small>{item.expectError ? 'should throw' : 'should pass'}</small>
                  </span>
                  <code>{item.code}</code>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className={'result-panel ' + (result?.status ?? 'idle')}>
        <div className='result-heading'>
          <span>{result ? result.status : 'idle'}</span>
          <strong>{result ? result.name + ' - ' + result.expectation : 'Run a selector case'}</strong>
        </div>
        <pre>
          {result
            ? (result.code ? result.code + '\n\n' : '') + result.message + result.stack
            : 'Click a case or run all cases. Runtime failures are also printed to the console.'}
        </pre>
      </section>
    </main>
  );
}

function runCase(item: SelectorCase): CaseResult {
  const expectation = item.expectError ? 'expected throw' : 'expected pass';

  try {
    const output = item.run();
    if (item.expectError) {
      const message = 'Expected selector validation to throw, but the style call completed.';
      console.error('[selector-check] ' + item.name + ': ' + message, { output });
      return {
        name: item.name,
        code: item.code,
        status: 'fail',
        expectation,
        message: message + '\n\nOutput:\n' + (output || '(empty className)'),
        stack: '',
      };
    }

    console.info('[selector-check] ' + item.name + ': passed as expected', { output });
    return {
      name: item.name,
      code: item.code,
      status: 'pass',
      expectation,
      message: output || 'case completed without throwing',
      stack: '',
    };
  } catch (error) {
    if (error instanceof Error) {
      if (item.expectError) {
        console.error('[selector-check] ' + item.name + ': caught expected selector error', error);
        return {
          name: item.name,
          code: item.code,
          status: 'pass',
          expectation,
          message: 'Caught expected selector error.\n\n' + error.name + ': ' + error.message,
          stack: error.stack ? '\n\n' + error.stack : '',
        };
      }

      console.error('[selector-check] ' + item.name + ': unexpected selector error', error);
      return {
        name: item.name,
        code: item.code,
        status: 'fail',
        expectation,
        message: 'Unexpected selector error.\n\n' + error.name + ': ' + error.message,
        stack: error.stack ? '\n\n' + error.stack : '',
      };
    }

    const message = String(error);
    if (item.expectError) {
      console.error('[selector-check] ' + item.name + ': caught expected selector error', error);
      return {
        name: item.name,
        code: item.code,
        status: 'pass',
        expectation,
        message: 'Caught expected selector error.\n\n' + message,
        stack: '',
      };
    }

    console.error('[selector-check] ' + item.name + ': unexpected selector error', error);
    return {
      name: item.name,
      code: item.code,
      status: 'fail',
      expectation,
      message: 'Unexpected selector error.\n\n' + message,
      stack: '',
    };
  }
}

function groupCases(items: SelectorCase[]) {
  const groups: { name: string; items: SelectorCase[]; }[] = [];

  items.forEach((item) => {
    let group = groups.find((entry) => entry.name === item.group);
    if (!group) {
      group = { name: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });

  return groups;
}

function getModeLabel() {
  if (import.meta.env.MODE === 'pure') {
    return 'pure runtime dev - selector checks happen when a case runs';
  }
  if (import.meta.env.MODE === 'plugin-no-check') {
    return 'plugin dev without build-time checks - runtime fallback checks cases';
  }
  if (import.meta.env.MODE === 'plugin-force') {
    return 'plugin force mode - invalid static selectors should stop Vite before the page loads';
  }
  return 'plugin dev - invalid static selectors should stop Vite before the page loads';
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
