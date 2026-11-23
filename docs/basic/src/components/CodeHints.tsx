import { createContext } from 'react';

export type CodeHint = {
  term: string;
  line: RegExp;
  description: string;
  practice: string;
  example: string;
  path: string;
  performance?: string;
  linkLabel?: string;
};
export const CodeHintsContext = createContext<CodeHint[]>([]);
const hint = (
  term: string,
  line: RegExp,
  description: string,
  practice: string,
  example: string,
  path: string,
  details: Pick<CodeHint, 'performance' | 'linkLabel'> = {},
): CodeHint => ({ term, line, description, practice, example, path, ...details });
const styleProp = hint(
  'StyleProp',
  /css\?:/,
  'The type for styles accepted by one rendered element. It supports styles, arrays, and conditional values.',
  'Expose a css prop for the outer element. Put incoming styles last so callers can override your defaults.',
  '<article css={[cardStyle.root, props.css]} />',
  '/docs/reference/types/',
);
const styleTheme = hint(
  'StyleTheme',
  /theme\?:/,
  'The type for overrides that target a component’s named parts. A theme can contain a scope, multiple scopes, or conditional scopes.',
  'Expose a theme prop when callers need to customize internal parts such as a title. Bind the theme to the component root to keep overrides scoped.',
  'theme={style.scope([\n  cardStyle.title({ color: "blue" }),\n])}',
  '/docs/reference/types/',
);
const hints: Record<string, CodeHint[]> = {
  'first-style': [
    hint(
      'style',
      /const button = style/,
      'Creates a reusable style from typed CSS properties.',
      'Define a style once, then pass it to an element’s css prop.',
      'const button = style({ color: "blue" });\n<button css={button}>Save changes</button>',
      '/docs/reference/style/',
    ),
  ],
  hover: [
    hint(
      'hover',
      /\.hover\(/,
      'Adds styles that apply while the pointer is over the element.',
      'Keep interaction states with the base style. Use focusVisible for a visible keyboard-focus state too.',
      'style({ color: "blue" })\n  .hover({ color: "purple" })',
      '/docs/reference/style/',
    ),
  ],
  responsive: [
    hint(
      'media',
      /\.media\(/,
      'Applies an override when a CSS media query matches the viewport.',
      'Start with the default layout, then change only the properties needed at the breakpoint.',
      'style({ display: "flex" })\n  .media("(max-width: 640px)", {\n    flexDirection: "column",\n  })',
      '/docs/reference/style/',
    ),
  ],
  composition: [styleProp],
  dynamic: [
    hint(
      'color',
      /backgroundColor: color/,
      'This is the component’s runtime prop, used directly as a CSS value.',
      'Use props or state for values selected by your app. Fixed and runtime values can live in the same style.',
      'style({ backgroundColor: color })',
      '/docs/design/compiler-hoisting/',
      {
        performance:
          'With build-time extraction, Fluentic hoists supported style definitions out of the component so they are reused across renders. Dynamic values like color stay live through generated CSS variables: a render supplies the current value instead of rebuilding the style chain or generating a new CSS rule for each color.',
        linkLabel: 'How hoisting keeps inline styles efficient',
      },
    ),
  ],
  tailwind: [
    hint(
      'cx',
      /const button = cx/,
      'Your configured class-name factory. It translates utility names into Fluentic styles.',
      'Create the factory once with the Tailwind preset. Use the Factory and Plugin setup tabs to see the complete setup.',
      'cx("text-blue-500", "px-4")\n  .hover("text-blue-700")',
      '/docs/presets/tailwind/class-name/',
    ),
  ],
  'design-system': [
    hint(
      'ui',
      /const toolbar = ui/,
      'Your custom style factory. Its typed fields express your team’s design conventions.',
      'Give repeated patterns a meaningful field, then translate that field to CSS in the factory.',
      'ui({ row: true, center: true, gapX: 12 })',
      '/docs/beyond-the-basics/custom-style-builders/',
    ),
  ],
  parts: [styleProp, styleTheme],
  customize: [
    hint(
      'scope',
      /const compactCard = style.scope/,
      'Groups overrides for named slots into one reusable component theme.',
      'Target exported slots, then pass the scope through the component’s theme prop. Multiple scopes can be composed in an array.',
      'style.scope([\n  cardStyle.root({ padding: 12 }),\n  cardStyle.title({ fontSize: 16 }),\n])',
      '/docs/reference/style-scope/',
    ),
  ],
  tokens: [
    hint(
      'createTokens',
      /export const tokens = createTokens/,
      'Creates named, themeable values for shared colors, spacing, and other design choices.',
      'Use token names in styles instead of repeating literals. A theme can supply new values without rewriting those styles.',
      'const tokens = createTokens({ accent: "blue" });\nstyle({ color: tokens.accent })',
      '/docs/learn/create-themes/',
    ),
  ],
  themes: [
    hint(
      'createTheme',
      /const spaciousTheme = createTheme/,
      'Creates a theme that supplies replacement token values to a subtree.',
      'Apply it to a parent with css. Descendants that use those tokens pick up the new values.',
      'const theme = createTheme([tokens.accent("purple")]);\n<section css={theme}>…</section>',
      '/docs/learn/create-themes/',
    ),
  ],
  'app-values': [
    hint(
      'createValues',
      /export const color = createValues/,
      'Makes a set of literal values themeable while keeping those values readable in your styles.',
      'Use it when the literal is clearer than a token name. Use named tokens when you need a shared semantic contract.',
      'const color = createValues(["#ffffff", "#0f172a"]);\nstyle({ color: color("#0f172a") })',
      '/docs/learn/create-themes/',
    ),
  ],
  'app-theme': [
    hint(
      'darkTheme',
      /darkMode && darkTheme/,
      'This theme is included only when darkMode is true. The array composes it with the page’s base style.',
      'Drive theme selection from your app’s state. Keep the same component and change the values it receives.',
      '<main css={[page, darkMode && darkTheme]}>\n  Your app\n</main>',
      '/docs/learn/create-themes/',
    ),
  ],
  animation: [
    hint(
      'keyframes',
      /style.keyframes\(/,
      'Defines animation frames using the same style shape as your style factory.',
      'Reference the result with animationName and set a duration. Custom factories can use their own fields in keyframes too.',
      'const fade = style.keyframes({\n  from: { opacity: 0 }, to: { opacity: 1 },\n});\nstyle({ animationName: fade, animationDuration: "200ms" })',
      '/docs/beyond-the-basics/using-css-at-rules/',
    ),
  ],
  interop: [
    hint(
      'getClassName',
      /const resolved = getClassName/,
      'Resolves a Fluentic style into standard className and style props.',
      'Pass both props to a component that does not accept css. The style prop can carry dynamic values.',
      'const resolved = getClassName(button);\n<Button className={resolved.className} style={resolved.style}>\n  Save changes\n</Button>',
      '/docs/beyond-the-basics/interop-with-non-fluentic-apis/',
    ),
  ],
  production: [
    hint(
      'stylePlugin',
      /stylePlugin\(/,
      'Connects Fluentic to your bundler for CSS extraction and development tracing.',
      'Add the plugin to your build and configure the JSX import source. Register custom factories through importSources.',
      'stylePlugin()',
      '/docs/quick-start/',
    ),
  ],
};
export function getCodeHints(id: string, variant: string): CodeHint[] {
  if (variant === 'plugin') {
    return [
      hint(
        'importSources',
        /importSources:/,
        'Tells the compiler which imported functions are Fluentic style factories.',
        'Match source and name to the import used by your components. Pass the actual factory as styleFn.',
        'importSources: [{\n  source: "./styles", name: "ui", styleFn: ui,\n}]',
        '/docs/beyond-the-basics/custom-style-builders/',
      ),
    ];
  }
  if (variant === 'factory') {
    return id === 'tailwind'
      ? [
        hint(
          'createClassNameFn',
          /export const.*createClassNameFn/,
          'Creates the utility-name factory from a preset’s selectors and transform.',
          'Export it once and import the same factory in your app and bundler configuration.',
          'export const { className: cx } = createClassNameFn({\n  selectors: tailwind.selectors,\n  transform: tailwind.transform,\n});',
          '/docs/presets/tailwind/class-name/',
        ),
      ]
      : [
        hint(
          'styleTransform',
          /const transform = styleTransform/,
          'Defines how your custom style fields become CSS properties.',
          'Remove custom fields from the input, map them to CSS, and preserve the remaining CSS properties.',
          'if (row) css.display = "flex";\nreturn css;',
          '/docs/reference/transforms/',
        ),
      ];
  }
  return hints[id] ?? [];
}
