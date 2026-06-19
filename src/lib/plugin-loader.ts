import curl from '../plugins/curl';
import ffmpeg from '../plugins/ffmpeg';
import galleryDl from '../plugins/gallery-dl';
import lux from '../plugins/lux';
import spotdl from '../plugins/spotdl';
import ytdlp from '../plugins/ytdlp';

import macosDark from '../themes/os-macos-dark';
import macosLight from '../themes/os-macos-light';
import ubuntuDark from '../themes/os-ubuntu-dark';
import ubuntuLight from '../themes/os-ubuntu-light';
import win10Dark from '../themes/os-windows-10-dark';
import win10Light from '../themes/os-windows-10-light';
import win11Dark from '../themes/os-windows-11-dark';
import win11Light from '../themes/os-windows-11-light';

const BUILTIN_PLUGINS = [spotdl, galleryDl, lux, ffmpeg, curl, ytdlp];
const BUILTIN_THEMES = [win11Dark, win11Light, win10Dark, win10Light, macosDark, macosLight, ubuntuDark, ubuntuLight];

const pluginsRegistry = new Map<string, any>();
const themesRegistry = new Map<string, any>();

// Initialize registries with built-ins
for (const p of BUILTIN_PLUGINS) {
  pluginsRegistry.set(p.id, p);
}
for (const t of BUILTIN_THEMES) {
  themesRegistry.set(t.id, t);
}

// CommonJS module loader mock for external plugins/themes
export function loadCjsSource(source: string, filename: string): any {
  const module = { exports: {} as any };
  const exports = module.exports;

  const requireMock = (name: string): any => {
    if (name === 'path') {
      return {
        join: (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/'),
        basename: (p: string) => p.split('/').pop() || '',
        extname: (p: string) => {
          const base = p.split('/').pop() || '';
          const idx = base.lastIndexOf('.');
          return idx === -1 ? '' : base.slice(idx);
        }
      };
    }
    if (name === 'child_process') {
      return {
        execSync: () => {
          throw new Error('execSync is not supported in the browser. Use async checkDependency.');
        },
        spawn: (bin: string, args: string[]) => {
          const listeners: Record<string, any[]> = { close: [], error: [] };
          const stdoutListeners: Record<string, any[]> = { data: [] };
          const stderrListeners: Record<string, any[]> = { data: [] };

          setTimeout(async () => {
            try {
              const res = await window.api.execCommand(bin, args);
              if (res.stdout) {
                for (const cb of stdoutListeners.data) cb(res.stdout);
              }
              if (res.stderr) {
                for (const cb of stderrListeners.data) cb(res.stderr);
              }
              for (const cb of listeners.close) cb(res.success ? 0 : 1);
            } catch (err) {
              for (const cb of listeners.error) cb(err);
            }
          }, 0);

          return {
            stdout: {
              on: (event: string, cb: any) => { if (event === 'data') stdoutListeners.data.push(cb); }
            },
            stderr: {
              on: (event: string, cb: any) => { if (event === 'data') stderrListeners.data.push(cb); }
            },
            on: (event: string, cb: any) => {
              if (event === 'close') listeners.close.push(cb);
              if (event === 'error') listeners.error.push(cb);
            }
          };
        }
      };
    }
    throw new Error(`Module "${name}" is not supported in the browser.`);
  };

  try {
    const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', source);
    fn(module, exports, requireMock, '', filename);
    return module.exports;
  } catch (e) {
    console.error(`Error executing CJS source for ${filename}:`, e);
    return null;
  }
}

// Intercept checkDependency to run asynchronously via Tauri commands
function patchPluginDependencyCheck(plugin: any): void {
  plugin.checkDependency = async function(config: any) {
    const binKey = Object.keys(config).find(k => k.toLowerCase().endsWith('path')) || 'ytdlpPath';
    const bin = config[binKey] || plugin.id;
    const args = plugin.id === 'ffmpeg' ? ['-version'] : ['--version'];

    try {
      const res = await window.api.execCommand(bin, args);
      let version = res.stdout.trim().split('\n')[0];
      if (plugin.id === 'curl') {
        const m = res.stdout.match(/curl\s+([\d.]+)/i);
        version = m ? m[1] : version;
      } else if (plugin.id === 'ffmpeg') {
        const m = res.stdout.match(/ffmpeg version (\S+)/i);
        version = m ? m[1] : version;
      }
      return { available: res.success, version };
    } catch {
      return { available: false, version: '' };
    }
  };
}

// Apply patching to built-ins
for (const p of BUILTIN_PLUGINS) {
  patchPluginDependencyCheck(p);
}

export const pluginManager = {
  async loadExternalPlugins(externalPluginsDir: string): Promise<void> {
    try {
      const files = await window.api.readExternalFiles(externalPluginsDir);
      for (const file of files) {
        const plugin = loadCjsSource(file.content, file.name);
        if (plugin && plugin.id) {
          patchPluginDependencyCheck(plugin);
          pluginsRegistry.set(plugin.id, plugin);
        }
      }
    } catch (e) {
      console.error('Failed to load external plugins:', e);
    }
  },

  async loadExternalThemes(externalThemesDir: string): Promise<void> {
    try {
      const files = await window.api.readExternalFiles(externalThemesDir);
      for (const file of files) {
        const theme = loadCjsSource(file.content, file.name);
        if (theme && theme.id) {
          themesRegistry.set(theme.id, theme);
        }
      }
    } catch (e) {
      console.error('Failed to load external themes:', e);
    }
  },

  loadPluginFile(filename: string, content?: string): any {
    if (content === undefined && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        content = fs.readFileSync(filename, 'utf8');
      } catch (e: any) {
        return { id: filename, success: false, error: e.message };
      }
    }
    const plugin = loadCjsSource(content || '', filename);
    if (plugin && plugin.id) {
      patchPluginDependencyCheck(plugin);
      pluginsRegistry.set(plugin.id, plugin);
      return { id: plugin.id, success: true, error: null };
    }
    return { id: filename, success: false, error: 'Invalid plugin interface' };
  },

  loadThemeFile(filename: string, content?: string): any {
    if (content === undefined && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        content = fs.readFileSync(filename, 'utf8');
      } catch (e: any) {
        return { id: filename, success: false, error: e.message };
      }
    }
    const theme = loadCjsSource(content || '', filename);
    if (theme && theme.id) {
      themesRegistry.set(theme.id, theme);
      return { id: theme.id, success: true, error: null };
    }
    return { id: filename, success: false, error: 'Invalid theme interface' };
  },

  getDownloaderForUrl(url: string, disabledList: string[] = []): any {
    const ordered = [
      ...BUILTIN_PLUGINS,
      ...[...pluginsRegistry.values()].filter(p => p.type === 'downloader' && !BUILTIN_PLUGINS.includes(p)),
    ];

    for (const plugin of ordered) {
      if (disabledList.includes(plugin.id)) continue;
      if (plugin.canHandle && plugin.canHandle(url)) return plugin;
    }

    return pluginsRegistry.get('yt-dlp');
  },

  getPlugin(id: string): any {
    return pluginsRegistry.get(id) || null;
  },

  getAllPlugins(): { downloaders: any[]; searchers: any[] } {
    const all = [...pluginsRegistry.values()];
    return {
      downloaders: all.filter(p => p.type === 'downloader'),
      searchers: all.filter(p => p.type === 'searcher'),
    };
  },

  getTheme(id: string): any {
    return themesRegistry.get(id) || null;
  },

  getAllThemes(): any[] {
    return [...themesRegistry.values()].map(t => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      author: t.author || '',
      repoUrl: t.repoUrl || '',
      mode: t.mode || 'dark',
      swatches: Array.isArray(t.swatches) ? t.swatches : [],
      variables: t.variables || {},
      css: typeof t.css === 'string' ? t.css : '',
      isBuiltin: BUILTIN_THEMES.some(bt => bt.id === t.id),
    }));
  },

  getPluginConfig(pluginId: string, globalConfig: any): any {
    const pluginOverrides = (globalConfig.plugins || {})[pluginId] || {};
    return { ...globalConfig, ...pluginOverrides };
  },

  async checkAllDependencies(globalConfig: any): Promise<any> {
    const result: Record<string, any> = {};
    for (const plugin of pluginsRegistry.values()) {
      const cfg = this.getPluginConfig(plugin.id, globalConfig);
      const status = await plugin.checkDependency(cfg);
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
        isBuiltin: BUILTIN_PLUGINS.some(bp => bp.id === plugin.id),
      };
    }
    return result;
  }
};
