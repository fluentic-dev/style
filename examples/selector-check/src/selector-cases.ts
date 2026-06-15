import { getClassName, style } from '@fluentic/style';

export type SelectorCase = {
  group: string;
  name: string;
  code: string;
  expectError: boolean;
  run: () => string;
};

export const cases: SelectorCase[] = [
  {
    group: 'select',
    name: 'select current class',
    code: `style({ color: 'black' }).select('.is-active', { color: 'blue' })`,
    expectError: false,
    run: () => className(style({ color: 'black' }).select('.is-active', { color: 'blue' })),
  },
  {
    group: 'select',
    name: 'select nested child',
    code: `style({ color: 'black' }).select('.parent .child', { color: 'blue' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).select('.parent .child', { color: 'blue' })),
  },
  {
    group: 'select',
    name: 'select tag',
    code: `style({ color: 'black' }).select('button', { color: 'blue' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).select('button', { color: 'blue' })),
  },
  {
    group: 'select',
    name: 'select multiple',
    code: `style({ color: 'black' }).select('.one, .two', { color: 'blue' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).select('.one, .two', { color: 'blue' })),
  },
  {
    group: 'at rules',
    name: 'media valid',
    code: `style({ color: 'black' }).media('(max-width: 700px)', { color: 'blue' })`,
    expectError: false,
    run: () => className(style({ color: 'black' }).media('(max-width: 700px)', { color: 'blue' })),
  },
  {
    group: 'at rules',
    name: 'media with rule body',
    code: `style({ color: 'black' }).media('{ color: red }', { color: 'blue' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).media('{ color: red }', { color: 'blue' })),
  },
  {
    group: 'at rules',
    name: 'supports valid',
    code: `style({ color: 'black' }).supports('(display: grid)', { display: 'grid' })`,
    expectError: false,
    run: () => className(style({ color: 'black' }).supports('(display: grid)', { display: 'grid' })),
  },
  {
    group: 'at rules',
    name: 'supports with block',
    code: `style({ color: 'black' }).supports('(display: grid) { }', { display: 'grid' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).supports('(display: grid) { }', { display: 'grid' })),
  },
  {
    group: 'at rules',
    name: 'container with block',
    code: `style({ color: 'black' }).container('(min-width: 400px) { }', { color: 'blue' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).container('(min-width: 400px) { }', { color: 'blue' })),
  },
  {
    group: 'pseudo args',
    name: 'not current selector',
    code: `style({ color: 'black' }).not('.disabled', { opacity: 1 })`,
    expectError: false,
    run: () => className(style({ color: 'black' }).not('.disabled', { opacity: 1 })),
  },
  {
    group: 'pseudo args',
    name: 'not nested child',
    code: `style({ color: 'black' }).not('.parent .child', { opacity: 1 })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).not('.parent .child', { opacity: 1 })),
  },
  {
    group: 'pseudo args',
    name: 'nth child valid',
    code: `style({ color: 'black' }).nthChild('2n + 1', { color: 'blue' })`,
    expectError: false,
    run: () => className(style({ color: 'black' }).nthChild('2n + 1', { color: 'blue' })),
  },
  {
    group: 'pseudo args',
    name: 'nth child with block',
    code: `style({ color: 'black' }).nthChild('2n { color: red }', { color: 'blue' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).nthChild('2n { color: red }', { color: 'blue' })),
  },
  {
    group: 'attr',
    name: 'attr name',
    code: `style({ color: 'black' }).attr('data-state="open"', { color: 'blue' })`,
    expectError: false,
    run: () => className(style({ color: 'black' }).attr('data-state="open"', { color: 'blue' })),
  },
  {
    group: 'attr',
    name: 'attr already wrapped',
    code: `style({ color: 'black' }).attr('[data-state="open"]', { color: 'blue' })`,
    expectError: true,
    run: () => className(style({ color: 'black' }).attr('[data-state="open"]', { color: 'blue' })),
  },
];

function className(value: Parameters<typeof getClassName>[0]) {
  return getClassName(value).className ?? '';
}
