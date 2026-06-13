const path = require('path');
const fs = require('fs');

// Built-in themes registered at module load time.
const BUILTIN_THEMES = [
  require('./themes/xtractforge-default'),
  require('./themes/cyber-glass'),
  require('./themes/alexandria'),
  require('./themes/matrix'),
  require('./themes/dracula'),
  require('./themes/nord'),
  require('./themes/solarized-light'),
];

// All loaded themes (builtin + external) keyed by theme.id, insertion-ordered.
const registry = new Map();

function _register(theme) {
  if (!theme || !theme.id || !theme.name || typeof theme.variables !== 'object') {
    console.warn('[ThemeManager] Skipping invalid theme (needs id/name/variables):', theme && theme.id);
    return false;
  }
  registry.set(theme.id, theme);
  return true;
}

// Load built-ins into registry
for (const t of BUILTIN_THEMES) {
  _register(t);
}

/**
 * Load every .js theme file from a directory into the registry.
 * Returns array of { id, success, error } results.
 */
function loadExternalThemes(themeDir) {
  const results = [];
  if (!fs.existsSync(themeDir)) {
    try { fs.mkdirSync(themeDir, { recursive: true }); } catch {}
    return results;
  }

  const files = fs.readdirSync(themeDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const filePath = path.join(themeDir, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const theme = require(filePath);
      const ok = _register(theme);
      results.push({ id: theme.id || file, success: ok, error: ok ? null : 'Invalid theme interface' });
    } catch (e) {
      results.push({ id: file, success: false, error: e.message });
    }
  }
  return results;
}

/**
 * Load a single external theme file by absolute path.
 * Returns { id, success, error }.
 */
function loadThemeFile(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    const theme = require(filePath);
    const ok = _register(theme);
    return { id: theme.id || path.basename(filePath), success: ok, error: ok ? null : 'Invalid theme interface (needs id/name/variables)' };
  } catch (e) {
    return { id: path.basename(filePath), success: false, error: e.message };
  }
}

function getTheme(id) {
  return registry.get(id) || null;
}

// Returns serializable theme metadata for the renderer (includes variables + css).
function getAllThemes() {
  return [...registry.values()].map(t => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    author: t.author || '',
    repoUrl: t.repoUrl || '',
    mode: t.mode || 'dark',
    swatches: Array.isArray(t.swatches) ? t.swatches : [],
    variables: t.variables || {},
    css: typeof t.css === 'string' ? t.css : '',
    isBuiltin: BUILTIN_THEMES.includes(t),
  }));
}

module.exports = {
  loadExternalThemes,
  loadThemeFile,
  getTheme,
  getAllThemes,
};
