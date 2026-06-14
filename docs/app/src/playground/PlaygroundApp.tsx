'use client';

import type { editor as MonacoEditor, IDisposable } from 'monaco-editor';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compilePlayground, type CompileTrace, type PlaygroundFile } from './playground-compiler';
import {
  compilerConfig as defaultCompilerConfig,
  examples,
} from './playground-examples';
import './playground.css';

type RuntimeWorkerResult = { kind: 'result'; id: number; html?: string; css?: string; error?: string; };
type OutputPanel = 'runtimeCss' | 'buildJs' | 'buildCss' | 'trace' | 'errors';
type CodeOutputPanel = Exclude<OutputPanel, 'trace' | 'errors'>;
type PreviewTab = 'preview' | 'config';
type MonacoModule = typeof import('monaco-editor');
type CssOptionsState = {
  layers: string[];
  layerNamespace: string;
  classNamePrefix: string;
  scopeTargetPrefix: string;
  themeNamePrefix: string;
  tokenVarPrefix: string;
  localClassName: boolean;
  debugClassName: boolean;
  debugPropertyLength: number;
  debugValueLength: number;
  debugSelectorLength: number;
  debugParentSelectorLength: number;
  debugAtRuleLength: number;
};
type MonacoWorkerGlobal = typeof globalThis & {
  MonacoEnvironment?: { getWorker: (_id: string, label: string) => Worker; };
};

const createEditorWorker = () =>
  new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), { type: 'module' });
const createCssWorker = () =>
  new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url), { type: 'module' });
const createJsonWorker = () =>
  new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url), { type: 'module' });
const createTsWorker = () =>
  new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url), { type: 'module' });

const THEME_NAME = 'fluentic-light';
let monacoConfigured = false;
const FONT_FAMILY = '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace';
const CODE_OUTPUT_IDS = new Set<OutputPanel>(['buildJs', 'buildCss', 'runtimeCss']);
const basePath = process.env.NEXT_PUBLIC_DOCS_BASE ?? '';
const BASE_URL = `${basePath}/`;

const outputTabs: Array<{ id: OutputPanel; label: string; }> = [
  { id: 'buildJs', label: 'JS Output' },
  { id: 'buildCss', label: 'Prod CSS' },
  { id: 'runtimeCss', label: 'Debug CSS' },
  { id: 'trace', label: 'Trace' },
  { id: 'errors', label: 'Errors' },
];

const readonlyEditorOptions = {
  automaticLayout: true,
  contextmenu: false,
  cursorStyle: 'line-thin',
  fixedOverflowWidgets: true,
  folding: false,
  fontFamily: FONT_FAMILY,
  fontSize: 13,
  lineHeight: 22,
  lineNumbers: 'off',
  minimap: { enabled: false },
  occurrencesHighlight: 'off',
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
  padding: { bottom: 14, top: 14 },
  readOnly: true,
  readOnlyMessage: { value: '' },
  renderLineHighlight: 'none',
  scrollBeyondLastLine: false,
  scrollbar: {
    useShadows: false,
    vertical: 'visible',
    horizontal: 'visible',
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
  selectionHighlight: false,
  smoothScrolling: true,
  theme: THEME_NAME,
  wordWrap: 'on',
} as Parameters<MonacoModule['editor']['create']>[1];

export default function PlaygroundApp() {
  const firstExample = examples[0];
  const [exampleId, setExampleId] = useState(firstExample.id);
  const [files, setFiles] = useState<PlaygroundFile[]>(firstExample.files);
  const [activeFile, setActiveFile] = useState(firstExample.files[0].name);
  const [selectedOutput, setSelectedOutput] = useState<OutputPanel>('trace');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('preview');
  const [previewWidth, setPreviewWidth] = useState(34);
  const [dockHeight, setDockHeight] = useState(260);
  const [isDockCollapsed, setDockCollapsed] = useState(false);
  const [isPreviewCollapsed, setPreviewCollapsed] = useState(false);
  const [cssOptions, setCssOptions] = useState<CssOptionsState>(() => ({ ...defaultCompilerConfig.css }));
  const [runtimeCss, setRuntimeCss] = useState('/* Waiting for runtime output. */');
  const [buildJs, setBuildJs] = useState('// Waiting for build output.');
  const [buildCss, setBuildCss] = useState('/* Waiting for build output. */');
  const [traces, setTraces] = useState<CompileTrace[]>([]);
  const [previewDoc, setPreviewDoc] = useState(() => createPreviewDoc('', ''));
  const [diagnostics, setDiagnostics] = useState('');
  const [status, setStatus] = useState('Ready');
  const [activeTraceKey, setActiveTraceKey] = useState('');
  const [sourceFocus, setSourceFocus] = useState<{ file: string; line: number; column: number; } | null>(null);
  const [isEditorReady, setEditorReady] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // DOM refs
  const workspaceRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLElement>(null);
  const monacoHostRef = useRef<HTMLDivElement>(null);
  const outputHostRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<PlaygroundFile[]>(files);

  // Monaco refs
  const monacoRef = useRef<MonacoModule | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const outputEditorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const sourceDecorRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);
  const completionRef = useRef<IDisposable | null>(null);
  const definitionRef = useRef<IDisposable | null>(null);
  const modelUpdateRef = useRef(false);
  const runtimeWorker = useRef<Worker | null>(null);
  const runId = useRef(0);

  const activeCode = useMemo(
    () => files.find((f) => f.name === activeFile)?.code ?? '',
    [files, activeFile],
  );

  const currentExample = examples.find((e) => e.id === exampleId);

  const isLoading = status.includes('Updating') || status === 'Ready';
  const isError = status.includes('error') || status.includes('Error');

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  function switchExample(id: string) {
    const example = examples.find((e) => e.id === id);
    if (!example) return;
    setExampleId(id);
    setFiles(example.files);
    setActiveFile(example.files[0].name);
    setStatus('Updating…');
    setDiagnostics('');
    setShowDropdown(false);
    clearTrace();
  }

  function clearTrace() {
    setActiveTraceKey('');
    setSourceFocus(null);
    sourceDecorRef.current?.clear();
  }

  const runRuntime = useCallback(
    (config: CssOptionsState) => {
      const worker = runtimeWorker.current;
      if (!worker) return;
      const id = ++runId.current;
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      worker.postMessage({ kind: 'run', id, files, config });
    },
    [files],
  );

  const runBuild = useCallback(
    (prodConfig: { css: Partial<CssOptionsState>; }, debugConfig: { css: Partial<CssOptionsState>; }) => {
      try {
        const prodResult = compilePlayground(files, prodConfig);
        const debugResult = compilePlayground(files, debugConfig);
        setBuildJs(prodResult.js || '// No JavaScript output.');
        setBuildCss(formatOutputCss(prodResult.css || '/* No static CSS extracted. */'));
        setTraces(debugResult.traces);
        setDiagnostics('');
        setStatus('Build ready');
      } catch (error) {
        setBuildJs('// Build failed.');
        setBuildCss('/* Build failed. */');
        setStatus('Build error');
        setDiagnostics(error instanceof Error && error.stack ? error.stack : String(error));
      }
    },
    [files],
  );

  const runPlayground = useCallback(() => {
    runRuntime(cssOptions);
    runBuild(
      { css: getProdCssOptions(cssOptions) },
      { css: getDebugCssOptions(cssOptions) },
    );
  }, [cssOptions, runRuntime, runBuild]);

  function updateCssOption<K extends keyof CssOptionsState>(key: K, value: CssOptionsState[K]) {
    setCssOptions((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    runtimeWorker.current = new Worker(
      new URL('./playground-runtime-worker.ts', import.meta.url),
      { type: 'module' },
    );
    const worker = runtimeWorker.current;
    worker.addEventListener('message', (event: MessageEvent<RuntimeWorkerResult>) => {
      const data = event.data;
      if (!data || data.kind !== 'result' || data.id !== runId.current) return;
      if (data.error) {
        setStatus('Runtime error');
        setDiagnostics(data.error);
        setRuntimeCss('/* Runtime failed before CSS could be collected. */');
        return;
      }
      setDiagnostics('');
      setStatus('Runtime ready');
      setRuntimeCss(formatDebugCss(data.css || '/* No runtime rules collected. */'));
      setPreviewDoc(createPreviewDoc(data.html ?? '', data.css ?? ''));
    });
    return () => {
      worker.terminate();
      runtimeWorker.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(runPlayground, 180);
    setStatus('Updating…');
    return () => window.clearTimeout(timer);
  }, [runPlayground]);

  function jumpToTrace(trace: CompileTrace) {
    const fileName = resolvePlaygroundFileName(trace.filePath, files);
    setActiveTraceKey(getTraceKey(trace));
    setSourceFocus({ file: fileName, line: trace.line, column: trace.column });
    setActiveFile(fileName);
  }

  function startWorkspaceResize(event: React.PointerEvent) {
    event.preventDefault();
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const onMove = (e: PointerEvent) => {
      const rect = workspace.getBoundingClientRect();
      setPreviewWidth(clamp(((rect.right - e.clientX) / rect.width) * 100, 26, 50));
    };
    const onUp = () => window.removeEventListener('pointermove', onMove);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  function startDockResize(event: React.PointerEvent) {
    event.preventDefault();
    const pane = editorPaneRef.current;
    if (!pane) return;
    setDockCollapsed(false);
    const onMove = (e: PointerEvent) => {
      const rect = pane.getBoundingClientRect();
      setDockHeight(clamp(rect.bottom - e.clientY, 160, Math.max(220, rect.height - 260)));
    };
    const onUp = () => window.removeEventListener('pointermove', onMove);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  const configureMonaco = useCallback((monaco: MonacoModule) => {
    if (monacoConfigured) return;
    monacoConfigured = true;

    monaco.editor.defineTheme(THEME_NAME, {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '7b8191', fontStyle: 'italic' },
        { token: 'keyword', foreground: '9b5cf7' },
        { token: 'string', foreground: '8b5cf6' },
        { token: 'number', foreground: 'c76a00' },
        { token: 'identifier', foreground: '111827' },
        { token: 'delimiter', foreground: '7a8498' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#151b2c',
        'editor.lineHighlightBackground': '#f5f1ff',
        'editorLineNumber.foreground': '#9aa3b5',
        'editorLineNumber.activeForeground': '#8b5cf6',
        'editorCursor.foreground': '#7c3aed',
        'editor.selectionBackground': '#dbeafe',
        'editor.inactiveSelectionBackground': '#edf2ff',
        'editorIndentGuide.background1': '#edf0f6',
        'editorIndentGuide.activeBackground1': '#cbd5e1',
        'editorSuggestWidget.background': '#ffffff',
        'editorSuggestWidget.border': '#d8e2f3',
        'editorSuggestWidget.selectedBackground': '#f1edff',
        'editorSuggestWidget.highlightForeground': '#7c3aed',
        'peekView.border': '#8b5cf6',
        'peekViewEditor.background': '#ffffff',
        'peekViewEditor.matchHighlightBackground': '#fff3bf',
        'peekViewEditorGutter.background': '#ffffff',
        'peekViewResult.background': '#f8fafc',
        'peekViewResult.fileForeground': '#111827',
        'peekViewResult.lineForeground': '#64748b',
        'peekViewResult.matchHighlightBackground': '#fed7aa',
        'peekViewTitle.background': '#ffffff',
        'peekViewTitleDescription.foreground': '#64748b',
        'peekViewTitleLabel.foreground': '#111827',
        'scrollbarSlider.background': '#cbd5e180',
        'scrollbarSlider.hoverBackground': '#aebbd280',
      },
    });

    const compilerOptions = {
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      esModuleInterop: true,
      jsx: monaco.typescript.JsxEmit.Preserve,
      module: monaco.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
      noEmit: true,
      strict: false,
      target: monaco.typescript.ScriptTarget.ES2020,
    };
    monaco.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    monaco.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
    monaco.typescript.typescriptDefaults.setEagerModelSync(true);
    monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.typescript.typescriptDefaults.addExtraLib(
      fluenticDts(),
      'file:///node_modules/@fluentic/style/index.d.ts',
    );
  }, []);

  useEffect(() => {
    let disposed = false;

    async function mountEditor() {
      (globalThis as MonacoWorkerGlobal).MonacoEnvironment = {
        getWorker(_id, label) {
          if (label === 'typescript' || label === 'javascript') return createTsWorker();
          if (label === 'css') return createCssWorker();
          if (label === 'json') return createJsonWorker();
          return createEditorWorker();
        },
      };

      const monaco = await import('monaco-editor');
      if (disposed || !monacoHostRef.current || !outputHostRef.current) return;

      monacoRef.current = monaco;
      configureMonaco(monaco);
      completionRef.current?.dispose();
      completionRef.current = registerCompletions(monaco);
      definitionRef.current?.dispose();
      definitionRef.current = registerPlaygroundDefinitions(monaco, filesRef);

      const editor = monaco.editor.create(monacoHostRef.current, {
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        cursorSmoothCaretAnimation: 'on',
        fontFamily: FONT_FAMILY,
        fixedOverflowWidgets: true,
        fontLigatures: false,
        fontSize: 14,
        formatOnPaste: true,
        formatOnType: true,
        gotoLocation: {
          multipleDeclarations: 'goto',
          multipleDefinitions: 'goto',
          multipleImplementations: 'goto',
          multipleReferences: 'goto',
        },
        lineHeight: 24,
        minimap: { enabled: false },
        occurrencesHighlight: 'off',
        padding: { bottom: 18, top: 18 },
        quickSuggestions: true,
        renderLineHighlight: 'line',
        scrollBeyondLastLine: false,
        selectionHighlight: false,
        smoothScrolling: true,
        suggest: { preview: true, showMethods: true, showProperties: true, showSnippets: true },
        tabSize: 2,
        theme: THEME_NAME,
        wordWrap: 'on',
      });
      editorRef.current = editor;
      sourceDecorRef.current = editor.createDecorationsCollection();

      editor.onDidChangeModelContent(() => {
        if (modelUpdateRef.current) return;
        const model = editor.getModel();
        if (!model) return;
        const fileName = model.uri.path.replace(/^\/+/, '');
        setFiles((prev) => prev.map((f) => (f.name === fileName ? { ...f, code: model.getValue() } : f)));
      });

      editor.onDidChangeModel(() => {
        const model = editor.getModel();
        if (!model) return;

        const fileName = resolvePlaygroundFileName(
          model.uri.path.replace(/^\/+/, ''),
          filesRef.current,
        );

        if (filesRef.current.some((file) => file.name === fileName)) {
          setActiveFile(fileName);
        }
      });

      editor.onMouseDown((event) => {
        const browserEvent = event.event.browserEvent as MouseEvent;
        const position = event.target.position;
        if (!position || (!browserEvent.metaKey && !browserEvent.ctrlKey)) return;

        const model = editor.getModel();
        if (!model) return;

        const location = getPlaygroundDefinitionLocation(monaco, model, position, filesRef.current);
        if (!location) return;

        event.event.preventDefault();
        event.event.stopPropagation();

        const targetModel = monaco.editor.getModel(location.uri);
        if (!targetModel) return;

        const fileName = resolvePlaygroundFileName(location.uri.path.replace(/^\/+/, ''), filesRef.current);
        setActiveFile(fileName);
        editor.setModel(targetModel);
        editor.setPosition({
          column: location.range.startColumn,
          lineNumber: location.range.startLineNumber,
        });
        editor.revealPositionInCenter({
          column: location.range.startColumn,
          lineNumber: location.range.startLineNumber,
        }, monaco.editor.ScrollType.Smooth);
      });

      const outputEditor = monaco.editor.create(outputHostRef.current, readonlyEditorOptions);
      outputEditorRef.current = outputEditor;

      document.fonts.ready.then(() => {
        if (!disposed) monaco.editor.remeasureFonts();
      });
      setEditorReady(true);
    }

    mountEditor();

    return () => {
      disposed = true;
      completionRef.current?.dispose();
      completionRef.current = null;
      definitionRef.current?.dispose();
      definitionRef.current = null;
      sourceDecorRef.current?.clear();
      sourceDecorRef.current = null;
      editorRef.current?.dispose();
      editorRef.current = null;
      outputEditorRef.current?.dispose();
      outputEditorRef.current = null;
      monacoConfigured = false;
    };
  }, [configureMonaco]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    for (const file of files) {
      const uri = monaco.Uri.parse(`file:///${file.name}`);
      let model = monaco.editor.getModel(uri);
      if (!model) {
        model = monaco.editor.createModel(file.code, getLanguage(file.name), uri);
      } else if (model.getValue() !== file.code) {
        modelUpdateRef.current = true;
        model.setValue(file.code);
        modelUpdateRef.current = false;
      }
    }

    const activeUri = monaco.Uri.parse(`file:///${activeFile}`);
    const activeModel = monaco.editor.getModel(activeUri) ??
      monaco.editor.createModel(activeCode, getLanguage(activeFile), activeUri);
    if (editor.getModel() !== activeModel) {
      editor.setModel(activeModel);
      editor.focus();
    }
  }, [activeCode, activeFile, files, isEditorReady]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = outputEditorRef.current;
    if (!monaco || !editor || !CODE_OUTPUT_IDS.has(selectedOutput)) return;

    const outputMap: Record<CodeOutputPanel, { code: string; language: string; }> = {
      runtimeCss: { code: runtimeCss, language: 'css' },
      buildJs: { code: buildJs, language: 'javascript' },
      buildCss: { code: buildCss, language: 'css' },
    };
    const current = outputMap[selectedOutput as CodeOutputPanel];
    if (!current) return;

    const uri = monaco.Uri.parse(`inmemory://output/${selectedOutput}`);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(current.code, current.language, uri);
    } else {
      if (model.getValue() !== current.code) model.setValue(current.code);
      monaco.editor.setModelLanguage(model, current.language);
    }
    if (editor.getModel() !== model) editor.setModel(model);
  }, [selectedOutput, runtimeCss, buildJs, buildCss]);

  useEffect(() => {
    if (isDockCollapsed) return;
    window.setTimeout(() => {
      outputEditorRef.current?.layout();
    }, 20);
  }, [isDockCollapsed]);

  useEffect(() => {
    if (!sourceFocus || sourceFocus.file !== activeFile) return;
    const timer = window.setTimeout(() => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;
      editor.revealLineInCenter(sourceFocus.line, monaco.editor.ScrollType.Smooth);
      editor.setPosition({ column: sourceFocus.column, lineNumber: sourceFocus.line });
      editor.focus();
      sourceDecorRef.current?.set([{
        range: new monaco.Range(sourceFocus.line, 1, sourceFocus.line, 1),
        options: {
          isWholeLine: true,
          className: 'pg-monaco-line-hit',
          linesDecorationsClassName: 'pg-monaco-line-hit-glyph',
        },
      }]);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeFile, sourceFocus]);

  useEffect(() => () => {
    completionRef.current?.dispose();
    definitionRef.current?.dispose();
  }, []);

  const isCodeOutput = CODE_OUTPUT_IDS.has(selectedOutput);

  return (
    <div className='pg-app'>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className='pg-topbar'>
        <span className='pg-brand'>
          <img src={`${BASE_URL}logo.png`} className='pg-logo' alt='Fluentic' width={26} height={26} />
          <span className='pg-brand-title'>Playground</span>
        </span>
        <div className='pg-topbar-divider' />
        <a className='pg-docs-link' href={`${BASE_URL}docs/`}>← Docs</a>

        {/* Examples */}
        <div className='pg-examples-area' ref={dropdownRef}>
          <button
            type='button'
            className='pg-example-select-btn'
            aria-expanded={showDropdown}
            aria-haspopup='menu'
            onClick={() => setShowDropdown((v) => !v)}
          >
            <span className='pg-example-select-kicker'>Example</span>
            <span className='pg-example-select-label'>{currentExample?.label}</span>
            <span className={`pg-chevron${showDropdown ? ' is-up' : ''}`} aria-hidden='true' />
          </button>
          <div className={`pg-examples-dropdown-menu${showDropdown ? ' is-open' : ''}`} role='menu'>
            {examples.map((ex) => (
              <button
                key={ex.id}
                type='button'
                role='menuitem'
                aria-pressed={exampleId === ex.id}
                onClick={() => switchExample(ex.id)}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main workspace ───────────────────────────────────── */}
      <div
        className={`pg-workspace${isPreviewCollapsed ? ' is-preview-collapsed' : ''}`}
        ref={workspaceRef}
        style={{ '--pg-preview-width': `${previewWidth}%` } as React.CSSProperties}
      >
        {/* ── Left: editor pane ──────────────────────────────── */}
        <section
          className={`pg-editor-pane${isDockCollapsed ? ' is-dock-collapsed' : ''}`}
          aria-label='Source editor'
          ref={editorPaneRef}
          style={{ '--pg-dock-height': `${dockHeight}px` } as React.CSSProperties}
        >
          {/* File tabs */}
          <div className='pg-file-tabs' role='tablist' aria-label='Files'>
            {files.map((file) => (
              <button
                key={file.name}
                type='button'
                role='tab'
                aria-selected={activeFile === file.name}
                onClick={() => setActiveFile(file.name)}
              >
                {file.name}
              </button>
            ))}
          </div>

          {/* Status bar */}
          <div className='pg-editor-status'>
            <span>{activeFile}</span>
            {activeTraceKey && sourceFocus
              ? (
                <span className='pg-trace-chip'>
                  <span className='pg-trace-chip-label'>Trace</span>
                  <code className='pg-trace-chip-loc'>
                    {sourceFocus.file}:{sourceFocus.line}:{sourceFocus.column}
                  </code>
                  <button type='button' className='pg-trace-chip-clear' aria-label='Clear trace' onClick={clearTrace}>
                    ✕
                  </button>
                </span>
              )
              : null}
          </div>

          {/* Monaco source editor */}
          <div className='pg-monaco-shell'>
            <div ref={monacoHostRef} className='pg-monaco-host' />
            {!isEditorReady && <div className='pg-loading'>Loading TypeScript editor…</div>}
          </div>

          {/* Dock resizer */}
          <button
            type='button'
            className='pg-dock-resizer'
            aria-label='Resize output dock'
            onPointerDown={startDockResize}
          />

          {/* Output dock */}
          <section className='pg-dock' aria-label='Output'>
            <div className='pg-dock-tabs'>
              {outputTabs.map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  className={tab.id === 'errors' && diagnostics ? 'has-error' : undefined}
                  aria-selected={selectedOutput === tab.id}
                  onClick={() => {
                    setSelectedOutput(tab.id);
                    setDockCollapsed(false);
                  }}
                >
                  {tab.label}
                  {tab.id === 'errors' && diagnostics ? <span className='pg-tab-dot' aria-hidden='true' /> : null}
                </button>
              ))}
              <button
                type='button'
                className='pg-collapse-btn'
                aria-expanded={!isDockCollapsed}
                aria-label={isDockCollapsed ? 'Show output' : 'Hide output'}
                onClick={() => setDockCollapsed((v) => !v)}
              >
                <span className={`pg-chevron${isDockCollapsed ? '' : ' is-up'}`} aria-hidden='true' />
              </button>
            </div>

            <div className='pg-dock-body'>
              <div ref={outputHostRef} className={`pg-output-host${isCodeOutput ? '' : ' is-hidden'}`} />

              {/* Trace overlay */}
              <div className={`pg-trace-overlay${selectedOutput === 'trace' ? ' is-active' : ''}${traces.length === 0 ? ' is-empty' : ''}`}>
                {traces.length === 0
                  ? <p className='pg-trace-empty'>No source trace metadata was emitted.</p>
                  : traces.map((trace) => {
                    const fileName = resolvePlaygroundFileName(trace.filePath, files);
                    return (
                      <button
                        key={getTraceKey(trace)}
                        type='button'
                        aria-selected={activeTraceKey === getTraceKey(trace)}
                        onClick={() => jumpToTrace(trace)}
                      >
                        <span className='pg-trace-meta'>
                          <span className='pg-trace-file'>{fileName}</span>
                          <span className='pg-trace-loc'>{trace.line}:{trace.column}</span>
                        </span>
                        <code className='pg-trace-css'>
                          <TraceCss css={formatTraceCss(trace.css)} />
                        </code>
                      </button>
                    );
                  })}
              </div>

              <div className={`pg-errors-overlay${selectedOutput === 'errors' ? ' is-active' : ''}`}>
                {diagnostics
                  ? <pre>{diagnostics}</pre>
                  : <p className='pg-errors-empty'>Build and runtime diagnostics will appear here.</p>}
              </div>
            </div>
          </section>
        </section>

        {/* Workspace resizer */}
        <button
          type='button'
          className='pg-workspace-resizer'
          aria-hidden={isPreviewCollapsed}
          aria-label='Resize preview panel'
          disabled={isPreviewCollapsed}
          onPointerDown={startWorkspaceResize}
        />

        {/* ── Right: preview pane ─────────────────────────────── */}
        <section className={`pg-preview-pane${isPreviewCollapsed ? ' is-collapsed' : ''}`} aria-label='Preview'>
          {isPreviewCollapsed
            ? (
              <button
                type='button'
                className='pg-preview-restore'
                aria-label='Show preview panel'
                onClick={() => setPreviewCollapsed(false)}
              >
                <span className='pg-side-chevron is-left' aria-hidden='true' />
                <span>Preview</span>
              </button>
            )
            : null}
          {!isPreviewCollapsed && (
            <>
          <div className='pg-pane-head'>
            <div className='pg-pane-tabs'>
              <button
                type='button'
                aria-selected={previewTab === 'preview'}
                onClick={() => setPreviewTab('preview')}
              >
                Preview
              </button>
              <button
                type='button'
                aria-selected={previewTab === 'config'}
                onClick={() => setPreviewTab('config')}
              >
                Config
              </button>
            </div>
            <div className='pg-pane-actions'>
              {previewTab === 'preview'
                ? (
                <span className={`pg-pane-status${isError ? ' is-error' : isLoading ? ' is-loading' : ''}`}>
                  {isError ? (diagnostics ? '⚠ Error' : 'Error') : isLoading ? 'Loading…' : ''}
                </span>
                  )
                : null}
              <button
                type='button'
                className='pg-pane-collapse-btn'
                aria-label='Hide preview panel'
                onClick={() => setPreviewCollapsed(true)}
              >
                <span className='pg-side-chevron is-right' aria-hidden='true' />
              </button>
            </div>
          </div>

          <div className='pg-pane-content'>
            {/* Preview iframe */}
            <div className={`pg-iframe-wrap${previewTab === 'preview' ? ' is-active' : ''}`}>
              <iframe title='Fluentic Style playground preview' sandbox='' srcDoc={previewDoc} />
            </div>

            {/* Config controls */}
            <div className={`pg-config-overlay${previewTab === 'config' ? ' is-active' : ''}`}>
              <div className='pg-config-grid'>
                <div className='pg-config-item is-active'>
                  <div className='pg-config-controls'>
                    <label className='pg-config-field'>
                      <span>
                        <strong>Layer namespace</strong>
                        <small>Layer name used for emitted rules.</small>
                      </span>
                      <input
                        type='text'
                        value={cssOptions.layerNamespace}
                        onChange={(event) => updateCssOption('layerNamespace', event.currentTarget.value)}
                      />
                    </label>
                    <label className='pg-config-field'>
                      <span>
                        <strong>Class prefix</strong>
                        <small>Prefix applied to generated atomic class names.</small>
                      </span>
                      <input
                        type='text'
                        value={cssOptions.classNamePrefix}
                        onChange={(event) => updateCssOption('classNamePrefix', event.currentTarget.value)}
                      />
                    </label>
                    <label className='pg-config-field'>
                      <span>
                        <strong>Scope target prefix</strong>
                        <small>Prefix for generated scope target classes.</small>
                      </span>
                      <input
                        type='text'
                        value={cssOptions.scopeTargetPrefix}
                        onChange={(event) => updateCssOption('scopeTargetPrefix', event.currentTarget.value)}
                      />
                    </label>
                    <label className='pg-config-field'>
                      <span>
                        <strong>Theme prefix</strong>
                        <small>Prefix for generated theme class names.</small>
                      </span>
                      <input
                        type='text'
                        value={cssOptions.themeNamePrefix}
                        onChange={(event) => updateCssOption('themeNamePrefix', event.currentTarget.value)}
                      />
                    </label>
                    <label className='pg-config-field'>
                      <span>
                        <strong>Token prefix</strong>
                        <small>Prefix for generated CSS variable names.</small>
                      </span>
                      <input
                        type='text'
                        value={cssOptions.tokenVarPrefix}
                        onChange={(event) => updateCssOption('tokenVarPrefix', event.currentTarget.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Trace CSS syntax highlight ───────────────────────────────────────────────

function TraceCss({ css }: { css: string; }) {
  const m = css.match(/^(.+?)\s*\{\s*(.*?)\s*\}$/);
  if (!m) return <span>{css}</span>;

  const selector = m[1];
  const body = m[2];
  const props = body.split(';').map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <span className='pg-trcss-sel'>{selector}</span>
      <span className='pg-trcss-p'>{' { '}</span>
      {props.map((prop, i) => {
        const col = prop.indexOf(':');
        if (col < 0) return <span key={prop}>{prop}</span>;
        return (
          <span key={prop}>
            {i > 0 && <span className='pg-trcss-p'>{'; '}</span>}
            <span className='pg-trcss-prop'>{prop.slice(0, col).trim()}</span>
            <span className='pg-trcss-p'>{': '}</span>
            <span className='pg-trcss-val'>{prop.slice(col + 1).trim()}</span>
          </span>
        );
      })}
      <span className='pg-trcss-p'>{' }'}</span>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLanguage(fileName: string) {
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.css')) return 'css';
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
  return 'typescript';
}

function getProdCssOptions(options: CssOptionsState): Partial<CssOptionsState> {
  return {
    layers: options.layers,
    layerNamespace: options.layerNamespace,
    classNamePrefix: options.classNamePrefix,
    scopeTargetPrefix: options.scopeTargetPrefix,
    themeNamePrefix: options.themeNamePrefix,
    tokenVarPrefix: options.tokenVarPrefix,
  };
}

function getDebugCssOptions(options: CssOptionsState): Partial<CssOptionsState> {
  return {
    ...options,
    debugClassName: true,
    localClassName: true,
  };
}

function resolvePlaygroundFileName(filePath: string, files: PlaygroundFile[]) {
  const normalized = filePath.replace(/^\.?\//, '').replace(/\\/g, '/');
  const exact = files.find((file) => file.name === normalized);
  if (exact) return exact.name;

  const withoutExtension = normalized.replace(/\.[^.]+$/, '');
  const byStem = files.find((file) => file.name.replace(/\.[^.]+$/, '') === withoutExtension);
  if (byStem) return byStem.name;

  const bySuffix = files.find((file) => normalized.endsWith(file.name));
  if (bySuffix) return bySuffix.name;

  return normalized;
}

function getTraceKey(trace: CompileTrace) {
  return `${trace.key}-${trace.filePath}-${trace.line}-${trace.column}`;
}

function formatTraceCss(css: string): string {
  return css.replace(/\{(\S)/g, '{ $1').replace(/(\S)\}/g, '$1 }').trim();
}

function prettifyCss(raw: string): string {
  if (!raw.trim() || raw.startsWith('//') || raw.startsWith('/*')) return raw;

  const lines = raw.trim().split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    if (t.match(/^@\S.*\{$/) && !t.includes('}')) {
      out.push(t);
      continue;
    }
    if (t === '}') {
      while (out[out.length - 1] === '') out.pop();
      out.push('}');
      out.push('');
      continue;
    }

    const m = t.match(/^([^{]+?)\s*\{([^}]*)\}$/);
    if (m) {
      const selector = m[1].trim();
      const body = m[2].trim();
      if (!body) {
        out.push(`${selector} {}`);
      } else {
        const decls = body.split(';').map((d) => d.trim()).filter(Boolean);
        out.push(`${selector} {`);
        for (const d of decls) out.push(`  ${d};`);
        out.push('}');
      }
      out.push('');
      continue;
    }
    out.push(t);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function formatOutputCss(raw: string): string {
  return prettifyCss(stripLayerOrderPrelude(raw));
}

function formatDebugCss(raw: string): string {
  const css = stripLayerOrderPrelude(raw);
  if (!css.trim() || css.startsWith('//') || css.startsWith('/*')) return css;

  return css
    .split('\n')
    .map((line) => formatDebugCssLine(line.trim()))
    .filter(Boolean)
    .join('\n\n');
}

function formatDebugCssLine(line: string): string {
  const layerMatch = line.match(/^@layer\s+([^{}]+)\s*\{\s*([^{}]+)\s*\{\s*([^{}]*)\s*\}\s*\}$/);
  if (layerMatch) {
    return `@layer ${layerMatch[1].trim()} {\n  ${formatInlineRule(layerMatch[2], layerMatch[3])}\n}`;
  }

  const ruleMatch = line.match(/^([^{}]+)\s*\{\s*([^{}]*)\s*\}$/);
  if (ruleMatch) return formatInlineRule(ruleMatch[1], ruleMatch[2]);

  return line;
}

function formatInlineRule(selector: string, body: string): string {
  const decls = body.split(';').map(formatInlineDeclaration).filter(Boolean);
  const formattedBody = decls.length ? ` ${decls.join('; ')}; ` : ' ';
  return `${selector.trim()} {${formattedBody}}`;
}

function formatInlineDeclaration(decl: string): string {
  const trimmed = decl.trim();
  const colon = trimmed.indexOf(':');
  if (colon < 0) return trimmed;
  return `${trimmed.slice(0, colon).trim()}: ${trimmed.slice(colon + 1).trim()}`;
}

function stripLayerOrderPrelude(raw: string): string {
  return raw
    .split('\n')
    .filter((line) => !/^@layer\s+[^{}]+;\s*$/.test(line.trim()))
    .join('\n')
    .trim();
}

function createPreviewDoc(html: string, css: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; min-height: 100%; }
    body { background: #eef4fb; color: #111827; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    .demo-shell { min-height: 100vh; display: grid; place-items: center; padding: 44px; box-sizing: border-box; }
    ${css}
  </style>
</head>
<body>${html}</body>
</html>`;
}

function registerCompletions(monaco: MonacoModule) {
  return monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['.', "'", '"', '{'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        endColumn: word.endColumn,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        startLineNumber: position.lineNumber,
      };
      return {
        suggestions: [
          {
            label: 'style.slot',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "style.slot({\\n  ${1:display}: ${2:'grid'},\\n  ${3:gap}: ${4:'16px'}\\n})",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Create a Fluentic slot',
            range,
          },
          {
            label: 'style.scope',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "style.scope([\\n  ${1:slot}({\\n    ${2:backgroundColor}: ${3:'#ffffff'}\\n  })\\n])",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Create a Fluentic scope',
            range,
          },
          {
            label: 'combineStyle',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "combineStyle(${1:styles}, ${2:theme}(${1:styles}.root))",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Resolve slots with a targeted scope',
            range,
          },
        ],
      };
    },
  });
}

function registerPlaygroundDefinitions(
  monaco: MonacoModule,
  filesRef: React.RefObject<PlaygroundFile[]>,
) {
  return monaco.languages.registerDefinitionProvider('typescript', {
    provideDefinition(model, position) {
      return getPlaygroundDefinitionLocation(monaco, model, position, filesRef.current ?? []);
    },
  });
}

function getPlaygroundDefinitionLocation(
  monaco: MonacoModule,
  model: MonacoEditor.ITextModel,
  position: { lineNumber: number; column: number; },
  files: PlaygroundFile[],
) {
  const word = model.getWordAtPosition(position);
  if (!word) return null;

  const fileName = resolvePlaygroundFileName(model.uri.path.replace(/^\/+/, ''), files);
  const code = model.getValue();
  const propertyTarget = getPropertyDefinitionTarget(code, position, word.startColumn, word.word);
  const combinedTarget = propertyTarget
    ? getCombinedStyleDefinitionTarget(propertyTarget.qualifier, propertyTarget.property, code)
    : null;
  if (combinedTarget) {
    const importTarget = getImportedDefinitionTarget(combinedTarget.qualifier, code, fileName, files);
    const targetModel = importTarget ? getPlaygroundModel(monaco, importTarget.file) : model;
    const range = targetModel ? findDefinitionRange(monaco, targetModel, combinedTarget.property) : null;
    if (range && targetModel) return { range, uri: targetModel.uri };
  }

  const importTarget = getImportedDefinitionTarget(
    propertyTarget?.qualifier ?? word.word,
    code,
    fileName,
    files,
  );

  if (importTarget) {
    const targetModel = getPlaygroundModel(monaco, importTarget.file);
    const targetWord = propertyTarget?.property ?? importTarget.exportName;
    const range = targetModel ? findDefinitionRange(monaco, targetModel, targetWord) : null;
    if (range && targetModel) return { range, uri: targetModel.uri };
  }

  const localRange = findDefinitionRange(monaco, model, word.word);
  return localRange ? { range: localRange, uri: model.uri } : null;
}

function getCombinedStyleDefinitionTarget(
  localName: string,
  property: string,
  code: string,
) {
  const escapedLocal = escapeRegExp(localName);
  const match = new RegExp(
    `(?:const|let|var)\\s+${escapedLocal}\\s*=\\s*combineStyle\\s*\\(\\s*([A-Za-z_$][\\w$]*)`,
  ).exec(code);

  return match ? { property, qualifier: match[1] } : null;
}

function getImportedDefinitionTarget(
  localName: string,
  code: string,
  fromFile: string,
  files: PlaygroundFile[],
) {
  const imports = code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g);

  for (const match of imports) {
    const source = match[2];
    if (!source.startsWith('.')) continue;

    for (const specifier of match[1].split(',')) {
      const parts = specifier.trim().split(/\s+as\s+/);
      const exportName = parts[0]?.trim();
      const alias = (parts[1] ?? parts[0])?.trim();
      if (!exportName || alias !== localName) continue;

      const file = resolveRelativePlaygroundImport(source, fromFile, files);
      if (file) return { exportName, file };
    }
  }

  return null;
}

function getPropertyDefinitionTarget(
  code: string,
  position: { lineNumber: number; column: number; },
  wordStartColumn: number,
  property: string,
) {
  const line = code.split(/\r?\n/)[position.lineNumber - 1] ?? '';
  const beforeWord = line.slice(0, wordStartColumn - 1);
  const match = beforeWord.match(/([A-Za-z_$][\w$]*)\.\s*$/);
  return match ? { property, qualifier: match[1] } : null;
}

function resolveRelativePlaygroundImport(source: string, fromFile: string, files: PlaygroundFile[]) {
  const fromDir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/') + 1) : '';
  const normalized = `${fromDir}${source}`.replace(/^\.\//, '').replace(/\/\.\//g, '/');
  const candidates = [
    normalized,
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}.js`,
    `${normalized}.jsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
  ];

  return candidates.find((candidate) => files.some((file) => file.name === candidate)) ?? null;
}

function getPlaygroundModel(monaco: MonacoModule, fileName: string) {
  return monaco.editor.getModel(monaco.Uri.parse(`file:///${fileName}`));
}

function findDefinitionRange(
  monaco: MonacoModule,
  model: MonacoEditor.ITextModel,
  name: string,
) {
  const code = model.getValue();
  const escaped = escapeRegExp(name);
  const patterns = [
    new RegExp(`(^|\\n)\\s*export\\s+(?:const|let|var|function|class|interface|type)\\s+${escaped}\\b`),
    new RegExp(`(^|\\n)\\s*(?:const|let|var|function|class|interface|type)\\s+${escaped}\\b`),
    new RegExp(`(^|\\n)\\s*${escaped}\\s*:`),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(code);
    if (!match) continue;

    const index = match.index + match[0].lastIndexOf(name);
    const start = model.getPositionAt(index);
    const end = model.getPositionAt(index + name.length);
    return new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
  }

  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fluenticDts() {
  return `declare module '@fluentic/style' {
  export type CssValue = string | number;
  export type StyleObject = Record<string, CssValue | StyleObject | readonly unknown[] | undefined>;
  export type StyleProp = {
    readonly __fluenticStyleProp?: unique symbol;
  };
  export type StyleTheme = Scope | StyleTheme[];
  export type TokenTree<T> = {
    [K in keyof T]: T[K] extends object ? TokenTree<T[K]> : StyleToken<T[K]>;
  };
  export type CombinedStyle<T> = {
    [K in keyof T]: T[K] extends Slot | Style ? StyleProp
      : T[K] extends object ? CombinedStyle<T[K]>
      : T[K];
  };

  export type Slot = {
    (overrides?: StyleObject): Slot;
    hover(overrides: StyleObject): Slot;
    active(overrides: StyleObject): Slot;
    focus(overrides: StyleObject): Slot;
    focusVisible(overrides: StyleObject): Slot;
    media(query: string, overrides: StyleObject): Slot;
  };
  export type Style = Slot;

  export type Scope = {
    (target?: Slot | StyleProp): ScopeTarget;
    hover(styles: readonly ScopeItem[]): Scope;
    active(styles: readonly ScopeItem[]): Scope;
    media(query: string, styles: readonly ScopeItem[]): Scope;
  };
  export type ScopeTarget = {
    readonly __fluenticScopeTarget?: unique symbol;
  };
  export type ScopeItem = Slot | ScopeTarget | StyleProp | false | null | undefined;

  export type StyleToken<T = unknown> = { value: T; (value: T): unknown };

  export const style: {
    slot(styles: StyleObject): Slot;
    scope(styles?: unknown[]): Scope;
  };

  /** Create a reactive design token. */
  export function createToken<T>(value: T): StyleToken<T>;
  /** Create multiple tokens from an object. */
  export function createTokens<T extends object>(values: T): TokenTree<T>;
  /** Create a theme scope that overrides token values. */
  export function createTheme(overrides: readonly unknown[], debugId?: string): Scope;

  export function combineStyle<T extends object>(styles: T, ...scopes: readonly ScopeItem[]): CombinedStyle<T>;
  export function bindScope(target: Slot | StyleProp, ...scopes: readonly ScopeItem[]): ScopeTarget;

  export function getClassName(styleProp: StyleProp, props?: { className?: string }): { className?: string };
}
declare module '@fluentic/style/server' { export * from '@fluentic/style'; }
declare module 'react' {
  export type ReactNode = unknown;
}
declare namespace JSX {
  type Element = unknown;
  interface IntrinsicElements {
    [name: string]: {
      css?: import('@fluentic/style').StyleProp;
      className?: string;
      children?: unknown;
      [prop: string]: unknown;
    };
  }
}`;
}
