import { CSS_CONFIG } from '../config/config/css';
import { CSS_EXTRA_CONFIG } from '../config/config/css_extra';
import { DEBUG_CONFIG } from '../config/config/debug';
import { DEV_CONFIG, setDevUtilsRuntimeOptions } from '../config/config/dev';
import { RUNTIME_CONFIG } from '../config/config/runtime';
import type { SourcemapLocationMode, StylePriorityMode } from '../config/types';
import { clearElementMarkers } from '../runtime/core/elementMarker';
import { refreshDevSourcemapTags, refreshDevStyleTags } from '../sheet/dev';
import {
  createDevUtilsObject,
  DefaultUtilsName,
  getDevUtilsTarget,
  getTraceStartMessage,
  parseElementMarker,
  parsePriorityMode,
  parseSourcemapTrace as parseSourcemapMode,
  StorageKeys,
} from './fns';

const noopStorage = {
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

const getStorage = () => {
  const storage = globalThis.localStorage as Storage | undefined;

  return storage && typeof storage.getItem === 'function'
    ? storage
    : noopStorage;
};

export type StyleDevUtilsOptions = {
  name?: string;
  silent?: boolean;
};

export function enableStyleDevUtils(options: StyleDevUtilsOptions = {}) {
  const name = options.name ?? DefaultUtilsName;
  if (!name) return;

  applyPersistentDevConfig();

  const target = getDevUtilsTarget();
  if (!target) return;

  target[name] = getUtils(name);

  if (!options.silent) logCssDevUtilsEnabled(name);
}

function getUtils(displayName: string) {
  const setPriorityModeUtils = createDevUtilsObject({
    toLayer() {
      setPriorityMode('layer');
      return null;
    },

    toSort() {
      setPriorityMode('sort');
      return null;
    },
  });

  const setSourcemapTraceUtils = createDevUtilsObject({
    toStyle() {
      setSourcemapMode('style');
      return null;
    },

    toValue() {
      setSourcemapMode('value');
      return null;
    },
  });

  const setElementMarkerUtils = createDevUtilsObject({
    on() {
      setElementMarkerMode(true);
      return null;
    },

    off() {
      setElementMarkerMode(false);
      return null;
    },

    toOn() {
      setElementMarkerMode(true);
      return null;
    },

    toOff() {
      setElementMarkerMode(false);
      return null;
    },
  });

  const startupMessageUtils = createDevUtilsObject({
    on() {
      getStorage().removeItem(StorageKeys.startupMessage);
      return null;
    },

    off() {
      getStorage().setItem(StorageKeys.startupMessage, 'off');
      return null;
    },
  });

  const baseUtils = createDevUtilsObject({
    usage() {
      logUsage(displayName);
      return null;
    },

    info() {
      logInfo(displayName);
      return null;
    },

    getConfig() {
      const config = {
        runtime: RUNTIME_CONFIG,
        dev: DEV_CONFIG,
        debug: DEBUG_CONFIG,
        css: CSS_CONFIG,
        cssExtra: CSS_EXTRA_CONFIG,
      };

      console.log(config);
      return null;
    },

    reset() {
      resetDevUtils();
      return null;
    },

    setPriorityMode: setPriorityModeUtils,

    setElementMarker: setElementMarkerUtils,

    startupMessage: startupMessageUtils,
  });

  const pluginUtils = createDevUtilsObject({
    ...baseUtils,
    setSourcemapTrace: setSourcemapTraceUtils,
  });

  if (typeof globalThis.window === 'undefined') {
    return createDevUtilsObject({
      ...baseUtils,
      traceSourcemap() {
        traceSourcemap();
        return logTraceStart();
      },
    });
  }

  return pluginUtils;
}

function setSourcemapMode(mode: SourcemapLocationMode) {
  setDevUtilsRuntimeOptions({ sourcemapMode: mode });

  saveDevConfig();
  refreshDevSourcemapTags();

  logSourcemapMode(mode);
}

function setPriorityMode(mode: StylePriorityMode) {
  setDevUtilsRuntimeOptions({ priorityMode: mode });

  saveDevConfig();
  refreshDevStyleTags();

  logPriorityMode(mode);
}

function setElementMarkerMode(enabled: boolean) {
  setDevUtilsRuntimeOptions({ elementClassName: enabled });

  if (!enabled) clearElementMarkers();
  saveDevConfig();

  logElementMarkerMode(enabled);
}

function applyPersistentDevConfig() {
  const storage = getStorage();

  const priorityMode = parsePriorityMode(storage.getItem(StorageKeys.priorityMode));
  const sourcemapMode = parseSourcemapMode(storage.getItem(StorageKeys.sourcemapMode));
  const elementClassName = parseElementMarker(storage.getItem(StorageKeys.elementMarker));

  if (
    !priorityMode &&
    !sourcemapMode &&
    elementClassName === null
  ) return;

  setDevUtilsRuntimeOptions({
    priorityMode,
    sourcemapMode,
    elementClassName,
  });

  if (elementClassName === false) clearElementMarkers();
}

function writeStoredDevConfig() {
  const storage = getStorage();

  storage.setItem(
    StorageKeys.priorityMode,
    DEV_CONFIG.stylePriorityMode,
  );

  storage.setItem(
    StorageKeys.sourcemapMode,
    DEV_CONFIG.sourcemapLocationMode,
  );

  storage.setItem(
    StorageKeys.elementMarker,
    DEV_CONFIG.isElementClassNameEnabled ? 'true' : 'false',
  );
}

function removeStoredDevConfig() {
  const storage = getStorage();

  storage.removeItem(StorageKeys.priorityMode);
  storage.removeItem(StorageKeys.sourcemapMode);
  storage.removeItem(StorageKeys.elementMarker);
}

function saveDevConfig() {
  writeStoredDevConfig();
}

function resetDevUtils() {
  removeStoredDevConfig();
  setDevUtilsRuntimeOptions(null);

  refreshDevStyleTags();
  refreshDevSourcemapTags();
  clearElementMarkers();
  logReset();
}

async function traceSourcemap() {
  const trace = await import('./trace');

  const result = await trace.traceDevSourcemaps();

  logTraceCompleted(result);

  return result;
}

function logTraceStart() {
  return getTraceStartMessage();
}

function logTraceCompleted(result: {
  tags: number;
  rules: number;
  remapped: number;
  unresolved: number;
}) {
  console.log(
    '\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[sourcemap]\x1b[0m trace completed ' +
      `\x1b[2m(tags:${result.tags} rules:${result.rules} remapped:${result.remapped} unresolved:${result.unresolved})\x1b[0m`,
  );
}

function logSourcemapMode(mode: SourcemapLocationMode) {
  const message = `sourcemap trace mode: ${mode}`;

  console.log(
    `\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[sourcemap]\x1b[0m ${message}`,
  );
}

function logPriorityMode(mode: StylePriorityMode) {
  const message = `priority mode: ${mode}`;

  console.log(
    `\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[priority]\x1b[0m ${message}`,
  );
}

function logElementMarkerMode(enabled: boolean) {
  console.log(
    `\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[element-marker]\x1b[0m ${enabled ? 'on' : 'off'}`,
  );
}

function logReset() {
  console.log(
    '\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[dev-utils]\x1b[0m reset saved preferences',
  );
}

function logUsage(displayName: string) {
  console.group(`%c[${displayName}] usage`, 'font-weight:700;color:#a21caf');
  logUsageRows(displayName);
  console.groupEnd();
}

function logInfo(displayName: string) {
  console.group(`%c[${displayName}] info`, 'font-weight:700;color:#7c3aed');
  logInfoRows();
  console.groupEnd();
}

function logUsageRows(displayName: string) {
  const commands = getUsageCommands(displayName);

  for (const [command, description] of commands) {
    console.log(`%c${command}%c // ${description}`, 'color:#0891b2', 'color:#64748b');
  }
}

function logInfoRows() {
  const rows: string[][] = [
    ['Priority', getPriorityModeValue(), getPriorityModeDetail()],
    ['Sourcemap', getSourcemapLabel(), getSourcemapDetail()],
    ['ClassNames', getClassNameLabel(), getClassNameDetail()],
    ['ElementMark', getElementMarkerLabel(), getElementMarkerDetail()],
    ['CSS', getCssModeLabel(), getCssModeDetail()],
    ['Runtime', getRuntimeModeLabel(), getRuntimeDetail()],
    ['Plugin', getPluginLabel(), getPluginDetail()],
  ];

  for (const [label, value, detail] of rows) {
    console.log(
      `%c${label.padEnd(12)}%c${value}%c ${detail}`,
      'font-weight:700;color:#7c3aed',
      'font-weight:700;color:#111827',
      'color:#64748b',
    );
  }
}

function getRuntimeModeLabel() {
  return DEV_CONFIG.isDev ? 'dev' : 'prod';
}

function getRuntimeDetail() {
  const details = [
    RUNTIME_CONFIG.isRSC ? 'RSC runtime.' : 'Client runtime.',
    RUNTIME_CONFIG.isHoist ? 'Hoisting is enabled.' : 'Hoisting is disabled.',
  ];

  return details.join(' / ');
}

function getPluginLabel() {
  return RUNTIME_CONFIG.isPlugin ? 'active' : 'none';
}

function getPluginDetail() {
  return RUNTIME_CONFIG.isPlugin
    ? 'Build metadata is available.'
    : 'Only runtime helpers are available.';
}

function getCssModeLabel() {
  return RUNTIME_CONFIG.isExtracted ? 'extracted' : 'runtime';
}

function getCssModeDetail() {
  if (DEV_CONFIG.stylePriorityMode === 'layer') {
    const layer = CSS_CONFIG.layer
      ? 'Rules are wrapped in the configured CSS layer.'
      : 'Rules are not wrapped in an output CSS layer.';

    return `${layer} Priority sublayers control order.`;
  }

  return CSS_CONFIG.layer
    ? 'Sorted rules are wrapped in the configured CSS layer.'
    : 'Sorted rules are emitted without an output CSS layer.';
}

function getPriorityModeValue() {
  return DEV_CONFIG.stylePriorityMode;
}

function getPriorityModeDetail() {
  return DEV_CONFIG.stylePriorityMode === 'layer'
    ? 'Cascade layers control priority.'
    : 'Rules are ordered by priority.';
}

function getSourcemapLabel() {
  return DEV_CONFIG.isSourcemapEnabled ? DEV_CONFIG.sourcemapLocationMode : 'off';
}

function getSourcemapDetail() {
  if (!DEV_CONFIG.isSourcemapEnabled) {
    return 'Sourcemaps are disabled.';
  }

  if (!RUNTIME_CONFIG.isPlugin) {
    return 'Run traceSourcemap() to trace runtime callsites.';
  }

  return DEV_CONFIG.sourcemapLocationMode === 'style'
    ? 'Spread values trace to the style site.'
    : 'Spread values trace to the value source.';
}

function getClassNameLabel() {
  const labels = [
    DEBUG_CONFIG.isDebugClassNameEnabled ? 'debug' : '',
    DEV_CONFIG.isLocalClassNameEnabled ? 'local' : '',
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(' + ') : 'hashed';
}

function getClassNameDetail() {
  return [
    DEBUG_CONFIG.isDebugClassNameEnabled ? 'Friendly names are enabled.' : 'Compact names are enabled.',
    DEV_CONFIG.isLocalClassNameEnabled ? 'Names are callsite-scoped.' : 'Names use global hashes.',
  ].join(' / ');
}

function getElementMarkerLabel() {
  return DEV_CONFIG.isElementClassNameEnabled ? 'on' : 'off';
}

function getElementMarkerDetail() {
  return DEV_CONFIG.isElementClassNameEnabled
    ? `Format ${CSS_CONFIG.elementClassNameFormat}`
    : 'Element marker classes are disabled.';
}

function getUsageCommands(displayName: string) {
  const commands = [
    [`${displayName}.usage()`, 'Print this help text'],
    [`${displayName}.info()`, 'Print current debug status'],
    [`${displayName}.getConfig()`, 'Print current runtime config'],
    [`${displayName}.reset()`, 'Reset saved local debug preferences'],
    [`${displayName}.startupMessage.on()`, 'Show the initial helper message'],
    [`${displayName}.startupMessage.off()`, 'Hide the initial helper message'],
    [`${displayName}.setElementMarker.on()`, 'Add element source marker classes'],
    [`${displayName}.setElementMarker.off()`, 'Stop adding element source marker classes'],
    [`${displayName}.setPriorityMode.toLayer()`, 'Use layer priority mode'],
    [`${displayName}.setPriorityMode.toSort()`, 'Use sorted priority mode'],
  ];

  if (RUNTIME_CONFIG.isPlugin) {
    commands.push(
      [`${displayName}.setSourcemapTrace.toStyle()`, 'Map spread values to the style site'],
      [`${displayName}.setSourcemapTrace.toValue()`, 'Map spread values to the value source'],
    );
  } else {
    commands.push([`${displayName}.traceSourcemap()`, 'Trace runtime sourcemaps']);
  }

  return commands;
}

function logCssDevUtilsEnabled(displayName: string) {
  console.groupCollapsed(
    `%c✨ %c[${displayName}] %cpriority=%c${DEV_CONFIG.stylePriorityMode}%c sourcemap=%c${DEV_CONFIG.sourcemapLocationMode}%c marker=%c${getElementMarkerLabel()}%c │ %cFor usage run %c${displayName}.usage()`,
    'color:#eab308',
    'font-weight:700;color:#a21caf',
    'font-weight:700;color:#475569',
    'font-weight:800;color:#d97706',
    'font-weight:700;color:#475569',
    'font-weight:800;color:#059669',
    'font-weight:700;color:#475569',
    'font-weight:800;color:#0f766e',
    'color:#94a3b8',
    'font-weight:700;color:#475569',
    'font-weight:800;color:#0891b2',
  );

  logInfoRows();
  console.groupEnd();
}
