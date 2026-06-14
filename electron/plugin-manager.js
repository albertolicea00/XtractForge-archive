const path = require('path');
const fs = require('fs');

// Built-in plugins — ordered by URL specificity (most specific first, yt-dlp last)
const BUILTIN_PLUGINS = [
  require('./plugins/spotdl'),
  require('./plugins/gallery-dl'),
  require('./plugins/lux'),
  require('./plugins/ffmpeg'),
  require('./plugins/curl'),
  require('./plugins/ytdlp'),
];

// Holds all loaded plugins (builtin + external) keyed by plugin.id
const registry = new Map();

function _register(plugin) {
  if (!plugin.id || !plugin.name || !plugin.type) {
    console.warn('[PluginManager] Skipping invalid plugin (missing id/name/type):', plugin);
    return false;
  }
  registry.set(plugin.id, plugin);
  return true;
}

// Load built-ins into registry
for (const p of BUILTIN_PLUGINS) {
  _register(p);
}

/**
 * Load external plugins from a directory.
 * Each .js file in the dir is require()'d and registered.
 * Returns array of { id, success, error } results.
 */
function loadExternalPlugins(pluginDir) {
  const results = [];
  if (!fs.existsSync(pluginDir)) {
    try { fs.mkdirSync(pluginDir, { recursive: true }); } catch {}
    return results;
  }

  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const filePath = path.join(pluginDir, file);
    try {
      // Clear require cache so re-loads pick up changes
      delete require.cache[require.resolve(filePath)];
      const plugin = require(filePath);
      const ok = _register(plugin);
      results.push({ id: plugin.id || file, success: ok, error: ok ? null : 'Invalid plugin interface' });
    } catch (e) {
      results.push({ id: file, success: false, error: e.message });
    }
  }
  return results;
}

/**
 * Load a single external plugin file by absolute path.
 * Returns { id, success, error }.
 */
function loadPluginFile(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    const plugin = require(filePath);
    const ok = _register(plugin);
    return { id: plugin.id || path.basename(filePath), success: ok, error: ok ? null : 'Invalid plugin interface (missing id/name/type)' };
  } catch (e) {
    return { id: path.basename(filePath), success: false, error: e.message };
  }
}

function isEnabled(pluginId, disabledList) {
  return !disabledList.includes(pluginId);
}

function getDownloaderForUrl(url, disabledList = []) {
  const ordered = [
    ...BUILTIN_PLUGINS,
    // External downloaders after builtins but before yt-dlp fallback
    ...[...registry.values()].filter(p => p.type === 'downloader' && !BUILTIN_PLUGINS.includes(p)),
  ];

  for (const plugin of ordered) {
    if (!isEnabled(plugin.id, disabledList)) continue;
    if (plugin.canHandle && plugin.canHandle(url)) return plugin;
  }

  // yt-dlp always as final fallback
  return registry.get('yt-dlp');
}

function getPlugin(id) {
  return registry.get(id) || null;
}

function getAllPlugins() {
  const all = [...registry.values()];
  return {
    downloaders: all.filter(p => p.type === 'downloader'),
    searchers: all.filter(p => p.type === 'searcher'),
  };
}

function getPluginConfig(pluginId, globalConfig) {
  const pluginOverrides = (globalConfig.plugins || {})[pluginId] || {};
  return { ...globalConfig, ...pluginOverrides };
}

function checkAllDependencies(globalConfig) {
  const result = {};
  for (const plugin of registry.values()) {
    const cfg = getPluginConfig(plugin.id, globalConfig);
    const status = plugin.checkDependency ? plugin.checkDependency(cfg) : { available: false, version: '' };
    result[plugin.id] = {
      ...status,
      name: plugin.name,
      order: typeof plugin.order === 'number' ? plugin.order : 99,
      tag: plugin.tag || '',
      locales: plugin.locales || null,
      description: plugin.description,
      type: plugin.type,
      icon: plugin.icon || '🔌',
      repoUrl: plugin.repoUrl || '',
      installHint: plugin.installHint || '',
      install: plugin.install || null,
      configSchema: plugin.configSchema || [],
      isBuiltin: BUILTIN_PLUGINS.includes(plugin),
    };
  }
  return result;
}

module.exports = {
  loadExternalPlugins,
  loadPluginFile,
  getDownloaderForUrl,
  getPlugin,
  getAllPlugins,
  getPluginConfig,
  checkAllDependencies,
};
