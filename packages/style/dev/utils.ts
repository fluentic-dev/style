import {
  RUNTIME_CONFIG,
  setDebugElementClassName,
  setDevRuntimeOptions,
  setPriorityMode,
  setSourcemapTraceMode,
} from '../config';
import type { PriorityMode, SourcemapTraceMode } from '../config';
import { clearElementMarkers } from '../runtime/core/elementMarker';
import { refreshDevSourcemapTags, refreshDevStyleTags } from '../sheet/dev';
import {
  createDevUtilsObject,
  DefaultUtilsName,
  getDevUtilsTarget,
  getStorage,
  getStoredItem,
  getTraceStartMessage,
  parsePriorityMode,
  parseSourcemapTrace,
  removeStoredItem,
  setStoredItem,
  StorageKeys,
} from './fns';

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

  if (!options.silent && isStartupMessageEnabled()) {
    logCssDevUtilsEnabled(name);
  }
}

function getUtils(displayName: string) {
  const setPriorityModeUtils = createDevUtilsObject({
    toLayer() {
      setRuntimePriorityMode('layer');
      return null;
    },

    toSort() {
      setRuntimePriorityMode('sort');
      return null;
    },
  });

  const setSourcemapTraceUtils = createDevUtilsObject({
    toStyle() {
      setSourcemapTrace('style');
      return null;
    },

    toValue() {
      setSourcemapTrace('value');
      return null;
    },
  });

  const setElementMarkerUtils = createDevUtilsObject({
    toOn() {
      setElementMarkerMode(true);
      return null;
    },

    toOff() {
      setElementMarkerMode(false);
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
      console.log(RUNTIME_CONFIG);
      return null;
    },

    reset() {
      resetDevUtils();
      return null;
    },

    startupMessage: createDevUtilsObject({
      on() {
        setStartupMessageMode(true);
        return null;
      },

      off() {
        setStartupMessageMode(false);
        return null;
      },
    }),

    setPriorityMode: setPriorityModeUtils,

    setElementMarker: setElementMarkerUtils,
  });

  const pluginUtils = createDevUtilsObject({
    ...baseUtils,
    setSourcemapTrace: setSourcemapTraceUtils,
  });

  if (!RUNTIME_CONFIG.buildMeta) {
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

function setSourcemapTrace(mode: SourcemapTraceMode) {
  setSourcemapTraceMode(mode);
  saveDevConfig();
  refreshDevSourcemapTags();

  logSourcemapTraceMode(mode);
  return null;
}

function setRuntimePriorityMode(mode: PriorityMode) {
  setPriorityMode(mode);
  saveDevConfig();
  refreshDevStyleTags();

  logPriorityMode(mode);
}

function setElementMarkerMode(enabled: boolean) {
  setDebugElementClassName(enabled);
  if (!enabled) clearElementMarkers();
  saveDevConfig();

  logElementMarkerMode(enabled);
}

function setStartupMessageMode(enabled: boolean) {
  const storage = getStorage();

  if (!storage) {
    logPersistentUnavailable();
    return;
  }

  const saved = enabled
    ? removeStoredItem(storage, StorageKeys.startupMessage)
    : setStoredItem(storage, StorageKeys.startupMessage, 'off');

  if (!saved) {
    logPersistentUnavailable();
    return;
  }

  logStartupMessageMode(enabled);
}

function applyPersistentDevConfig() {
  const storage = getStorage();
  if (!storage) return;

  const priorityMode = parsePriorityMode(getStoredItem(storage, StorageKeys.priorityMode));
  const sourcemapTrace = parseSourcemapTrace(getStoredItem(storage, StorageKeys.sourcemapTrace));
  const savedElementMarker = getStoredItem(storage, StorageKeys.elementMarker);
  const elementMarker = savedElementMarker === null ? undefined : savedElementMarker === 'true';

  if (!priorityMode && !sourcemapTrace && elementMarker === undefined) return;

  setDevRuntimeOptions({
    priorityMode: priorityMode ?? undefined,
    sourcemapTrace: sourcemapTrace ?? undefined,
    debugElementClassName: elementMarker,
  });

  if (elementMarker === false) clearElementMarkers();
}

function saveDevConfig() {
  const storage = getStorage();
  if (!storage) return;

  if (!writeStoredDevConfig(storage)) logPersistentUnavailable();
}

function writeStoredDevConfig(storage: Storage) {
  return setStoredItem(storage, StorageKeys.priorityMode, RUNTIME_CONFIG.priorityMode) &&
    setStoredItem(storage, StorageKeys.sourcemapTrace, RUNTIME_CONFIG.sourcemapTrace) &&
    setStoredItem(
      storage,
      StorageKeys.elementMarker,
      RUNTIME_CONFIG.debugElementClassName ? 'true' : 'false',
    );
}

function removeStoredDevConfig(storage: Storage) {
  return removeStoredItem(storage, StorageKeys.priorityMode) &&
    removeStoredItem(storage, StorageKeys.sourcemapTrace) &&
    removeStoredItem(storage, StorageKeys.elementMarker);
}

function resetDevUtils() {
  const storage = getStorage();
  if (!storage || !removeStoredDevConfig(storage)) {
    logPersistentUnavailable();
    return;
  }

  setDevRuntimeOptions(null);
  refreshDevStyleTags();
  refreshDevSourcemapTags();
  clearElementMarkers();
  logReset();
}

function isStartupMessageEnabled() {
  const storage = getStorage();
  return storage ? getStoredItem(storage, StorageKeys.startupMessage) !== 'off' : true;
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

function logSourcemapTraceMode(mode: SourcemapTraceMode) {
  const message = `sourcemap trace mode: ${mode}`;

  console.log(
    `\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[sourcemap]\x1b[0m ${message}`,
  );
}

function logPriorityMode(mode: PriorityMode) {
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

function logPersistentUnavailable() {
  console.log(
    '\x1b[33m!\x1b[0m \x1b[1m\x1b[36m[dev-utils]\x1b[0m localStorage is unavailable',
  );
}

function logStartupMessageMode(enabled: boolean) {
  console.log(
    `\x1b[32m✔\x1b[0m \x1b[1m\x1b[36m[startup]\x1b[0m message: ${enabled ? 'on' : 'off'}`,
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
  return RUNTIME_CONFIG.isDev ? 'dev' : 'prod';
}

function getRuntimeDetail() {
  const details = [
    RUNTIME_CONFIG.isRSC ? 'RSC runtime.' : 'Client runtime.',
    RUNTIME_CONFIG.isHoistEnabled ? 'Hoisting is enabled.' : 'Hoisting is disabled.',
  ];

  return details.join(' / ');
}

function getPluginLabel() {
  return RUNTIME_CONFIG.buildMeta ? 'active' : 'none';
}

function getPluginDetail() {
  return RUNTIME_CONFIG.buildMeta
    ? 'Build metadata is available.'
    : 'Only runtime helpers are available.';
}

function getCssModeLabel() {
  return RUNTIME_CONFIG.isCssExtracted ? 'extracted' : 'runtime';
}

function getCssModeDetail() {
  if (RUNTIME_CONFIG.priorityMode === 'layer') {
    const layer = RUNTIME_CONFIG.layer
      ? 'Rules are wrapped in the configured CSS layer.'
      : 'Rules are not wrapped in an output CSS layer.';

    return `${layer} Priority sublayers control order.`;
  }

  return RUNTIME_CONFIG.layer
    ? 'Sorted rules are wrapped in the configured CSS layer.'
    : 'Sorted rules are emitted without an output CSS layer.';
}

function getPriorityModeValue() {
  return RUNTIME_CONFIG.priorityMode;
}

function getPriorityModeDetail() {
  return RUNTIME_CONFIG.priorityMode === 'layer'
    ? 'Cascade layers control priority.'
    : 'Rules are ordered by priority.';
}

function getSourcemapLabel() {
  return RUNTIME_CONFIG.isSourcemapEnabled ? RUNTIME_CONFIG.sourcemapTrace : 'off';
}

function getSourcemapDetail() {
  if (!RUNTIME_CONFIG.isSourcemapEnabled) {
    return 'Sourcemaps are disabled.';
  }

  if (!RUNTIME_CONFIG.buildMeta) {
    return 'Run traceSourcemap() to trace runtime callsites.';
  }

  return RUNTIME_CONFIG.sourcemapTrace === 'style'
    ? 'Spread values trace to the style site.'
    : 'Spread values trace to the value source.';
}

function getClassNameLabel() {
  const labels = [
    RUNTIME_CONFIG.debugClassName ? 'debug' : '',
    RUNTIME_CONFIG.localClassName ? 'local' : '',
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(' + ') : 'hashed';
}

function getClassNameDetail() {
  return [
    RUNTIME_CONFIG.debugClassName ? 'Friendly names are enabled.' : 'Compact names are enabled.',
    RUNTIME_CONFIG.localClassName ? 'Names are file-scoped.' : 'Names use global hashes.',
  ].join(' / ');
}

function getElementMarkerLabel() {
  return RUNTIME_CONFIG.debugElementClassName ? 'on' : 'off';
}

function getElementMarkerDetail() {
  return RUNTIME_CONFIG.debugElementClassName
    ? `Prefix ${RUNTIME_CONFIG.debugElementClassNamePrefix} is enabled.`
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

  if (RUNTIME_CONFIG.buildMeta) {
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
    `%c✨ %c[${displayName}] %cpriority=%c${RUNTIME_CONFIG.priorityMode}%c sourcemap=%c${RUNTIME_CONFIG.sourcemapTrace}%c marker=%c${getElementMarkerLabel()}%c │ %cFor usage run %c${displayName}.usage()`,
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
