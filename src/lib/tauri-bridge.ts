import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { appDataDir, downloadDir, join } from '@tauri-apps/api/path';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { pluginManager } from './plugin-loader';

declare global {
  interface Window {
    api: any;
  }
}

// Helper to determine OS platform
const getPlatform = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'darwin';
  if (ua.includes('windows')) return 'win32';
  return 'linux';
};

// Helper to check disk free space
const defaultFolder = async (): Promise<string> => {
  try {
    return await downloadDir();
  } catch {
    return '';
  }
};

let appDataPath = '';
let pluginsPath = '';
let themesPath = '';

const initPaths = async (): Promise<void> => {
  if (!appDataPath) {
    try {
      appDataPath = await appDataDir();
      pluginsPath = await join(appDataPath, 'plugins');
      themesPath = await join(appDataPath, 'themes');
    } catch (e) {
      console.error('Failed to init app paths:', e);
    }
  }
};

export const initTauriBridge = async (): Promise<void> => {
  await initPaths();

  // Load external plugins and themes
  await pluginManager.loadExternalPlugins(pluginsPath);
  await pluginManager.loadExternalThemes(themesPath);

  window.api = {
    platform: getPlatform(),

    setZoomFactor: (factor: number) => {
      try {
        getCurrentWebview().setZoom(factor);
      } catch (e) {
        console.error('Failed to set zoom factor:', e);
      }
    },

    getAppVersion: () => Promise.resolve('1.2.0'),

    checkForUpdates: async () => {
      try {
        const res = await fetch('https://api.github.com/repos/albertolicea00/XtractForge/releases/latest', {
          headers: { 'Accept': 'application/vnd.github+json' }
        });
        if (!res.ok) return { current: '1.2.0', latest: null, hasUpdate: false, error: `GitHub returned ${res.status}` };
        const data = await res.json();
        const latest = (data.tag_name || '').replace(/^v/, '');
        const current = '1.2.0';
        const cmp = (a: string, b: string) => {
          const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
          for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const d = (pa[i] || 0) - (pb[i] || 0);
            if (d) return d;
          }
          return 0;
        };
        const hasUpdate = latest && cmp(latest, current) > 0;
        return { current, latest: latest || null, hasUpdate, url: data.html_url || '' };
      } catch (e: any) {
        return { current: '1.2.0', latest: null, hasUpdate: false, error: e.message };
      }
    },

    checkDependencies: async () => {
      const cfg = await window.api.getSettings();
      return pluginManager.checkAllDependencies(cfg);
    },

    selectFolder: async () => {
      const current = await window.api.getDefaultDownloadsFolder();
      const res = await invoke<string | null>('select_folder', { defaultPath: current || null });
      if (res) {
        await window.api.saveSettings({ downloadFolder: res });
        return res;
      }
      return null;
    },

    getDefaultDownloadsFolder: async () => {
      const settings = await window.api.getSettings();
      if (settings.downloadFolder) return settings.downloadFolder;
      return defaultFolder();
    },

    openFolder: (p: string) => invoke('open_folder', { path: p }),

    openExternal: (url: string) => invoke('open_external', { url }),

    showContextMenu: () => {
      // Browser native handles text selections, no-op for Tauri wrapper
    },

    getVideoInfo: async (url: string, pluginId?: string) => {
      const forced = pluginId && pluginId !== 'auto' ? pluginManager.getPlugin(pluginId) : null;
      const plugin = forced || pluginManager.getDownloaderForUrl(url, (await window.api.getSettings()).disabledPlugins || []);
      if (!plugin) {
        return { success: false, error: 'No suitable downloader found for this URL.' };
      }
      const globalCfg = await window.api.getSettings();
      const pluginCfg = pluginManager.getPluginConfig(plugin.id, globalCfg);
      try {
        const result = await plugin.getInfo(url, pluginCfg);
        if (result.success) result.pluginId = plugin.id;
        return result;
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },

    startDownload: async (downloadId: string, url: string, options: any) => {
      const pluginId = options.pluginId || 'yt-dlp';
      const plugin = pluginManager.getPlugin(pluginId) || pluginManager.getPlugin('yt-dlp');
      const globalCfg = await window.api.getSettings();
      const pluginCfg = pluginManager.getPluginConfig(plugin.id, globalCfg);

      const finalFolder = options.downloadFolder || globalCfg.downloadFolder || (await defaultFolder());
      const stage = globalCfg.stageToTemp !== false;
      const organize = options.organize || globalCfg.organize || 'none';

      let workFolder = finalFolder;
      let tempDir: string | null = null;
      if (stage) {
        try {
          const hashBuf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(url));
          const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
          tempDir = await join(finalFolder, '.xtractforge-tmp', hashHex);
          workFolder = tempDir;
        } catch {
          tempDir = null;
          workFolder = finalFolder;
        }
      }

      const downloadOptions = {
        ...options,
        downloadFolder: workFolder,
        resume: stage,
        speedLimit: options.speedLimit || globalCfg.speedLimit,
        embedSubtitles: options.embedSubtitles ?? globalCfg.embedSubtitles,
        sponsorBlock: options.sponsorBlock ?? globalCfg.sponsorBlock,
      };

      const { binary, args } = plugin.buildDownloadArgs(url, downloadOptions, pluginCfg);

      activeDownloadsPlugins.set(downloadId, plugin.id);

      return invoke('start_download', {
        downloadId,
        binary,
        args,
        tempDir,
        finalDir: finalFolder,
        organizeMode: organize,
        pluginId: plugin.id
      });
    },

    cancelDownload: (downloadId: string) => invoke('cancel_download', { downloadId }),

    pauseDownload: (downloadId: string) => invoke('pause_download', { downloadId }),

    resumeDownload: (downloadId: string) => invoke('resume_download', { downloadId }),

    getDiskFree: async () => {
      const settings = await window.api.getSettings();
      const folder = settings.downloadFolder || (await defaultFolder());
      return invoke('get_disk_free', { path: folder });
    },

    updateTrayState: (statusText: string, tooltipText?: string, titleText?: string) => {
      return invoke('update_tray_state', { statusText, tooltipText, titleText });
    },

    getSettings: async () => {
      const res = await invoke<any>('get_settings');
      return {
        ytdlpPath: 'yt-dlp',
        ffmpegPath: 'ffmpeg',
        downloadFolder: '',
        speedLimit: '',
        embedSubtitles: false,
        sponsorBlock: false,
        disabledPlugins: [],
        autoCheckUpdates: true,
        language: 'en',
        stageToTemp: true,
        organize: 'none',
        themeMode: 'auto',
        useNativeTitlebar: false,
        useSystemAccentColor: true,
        osDarkMode: false,
        osAccentColor: null,
        runInBackground: false,
        trayFormatMode: 'default',
        trayCustomTemplate: '{status}: {percent}% ({active} active)',
        showTrayTitle: true,
        maxConcurrentDownloads: '2',
        ...res
      };
    },

    saveSettings: (settings: any) => invoke('save_settings', { settings }),

    getPluginConfigs: () => invoke('get_plugin_configs'),

    savePluginConfigs: (configs: any) => invoke('save_plugin_configs', { configs }),

    setPluginEnabled: async (pluginId: string, enabled: boolean) => {
      const settings = await window.api.getSettings();
      let disabled = settings.disabledPlugins || [];
      if (enabled) {
        disabled = disabled.filter((id: string) => id !== pluginId);
      } else {
        if (!disabled.includes(pluginId)) disabled.push(pluginId);
      }
      return window.api.saveSettings({ disabledPlugins: disabled });
    },

    importPluginFile: async (filePath: string) => {
      try {
        const filename = filePath.split('/').pop() || 'plugin.js';
        const content = await invoke<any>('exec_command', { binary: 'cat', args: [filePath] });
        if (content.success) {
          const res = pluginManager.loadPluginFile(filename, content.stdout);
          if (res.success) {
            await invoke('write_external_file', { dirPath: pluginsPath, filename, content: content.stdout });
          }
          return res;
        }
        return { id: filename, success: false, error: 'Failed to read plugin file' };
      } catch (e: any) {
        return { id: filePath, success: false, error: e.message };
      }
    },

    browsePluginFile: async () => {
      const filePath = await invoke<string | null>('select_file', { title: 'Import XtractForge Plugin', extension: 'js' });
      if (filePath) {
        return window.api.importPluginFile(filePath);
      }
      return null;
    },

    openPluginsDir: () => invoke('open_folder', { path: pluginsPath }),

    getThemes: () => Promise.resolve(pluginManager.getAllThemes()),

    getActiveTheme: async () => {
      const config = await window.api.getSettings();
      return {
        activeTheme: config.activeTheme || 'cyber-glass',
        themeSettings: config.themeSettings || { accentOverride: '', glassIntensity: 75, monoFont: false }
      };
    },

    setActiveTheme: async (themeId: string) => {
      if (pluginManager.getTheme(themeId)) {
        return window.api.saveSettings({ activeTheme: themeId });
      }
      return false;
    },

    saveThemeSettings: async (themeSettings: any) => {
      const current = await window.api.getSettings();
      const next = { ...(current.themeSettings || {}), ...themeSettings };
      return window.api.saveSettings({ themeSettings: next });
    },

    importThemeFile: async (filePath: string) => {
      try {
        const filename = filePath.split('/').pop() || 'theme.js';
        const content = await invoke<any>('exec_command', { binary: 'cat', args: [filePath] });
        if (content.success) {
          const res = pluginManager.loadThemeFile(filename, content.stdout);
          if (res.success) {
            await invoke('write_external_file', { dirPath: themesPath, filename, content: content.stdout });
          }
          return res;
        }
        return { id: filename, success: false, error: 'Failed to read theme file' };
      } catch (e: any) {
        return { id: filePath, success: false, error: e.message };
      }
    },

    browseThemeFile: async () => {
      const filePath = await invoke<string | null>('select_file', { title: 'Import XtractForge Theme', extension: 'js' });
      if (filePath) {
        return window.api.importThemeFile(filePath);
      }
      return null;
    },

    openThemesDir: () => invoke('open_folder', { path: themesPath }),

    // Custom execution helper used by plugins
    execCommand: (binary: string, args: string[]) => invoke('exec_command', { binary, args }),

    // Download event listeners
    onDownloadProgress: (callback: any) => {
      const sub = (data: any) => callback(data);
      progressCallbacks.add(sub);
      return () => progressCallbacks.delete(sub);
    },

    onDownloadComplete: (callback: any) => {
      let unsub: any;
      listen<any>('download-complete', (event) => {
        const { downloadId } = event.payload;
        activeDownloadsPlugins.delete(downloadId);
        callback(event.payload);
      }).then(fn => { unsub = fn; });
      return () => { if (unsub) unsub(); };
    },

    onDownloadError: (callback: any) => {
      let unsub: any;
      listen<any>('download-error', (event) => {
        const { downloadId } = event.payload;
        activeDownloadsPlugins.delete(downloadId);
        callback(event.payload);
      }).then(fn => { unsub = fn; });
      return () => { if (unsub) unsub(); };
    },

    onDownloadLog: (callback: any) => {
      let unsub: any;
      listen<any>('download-log', (event) => {
        const { downloadId, chunk } = event.payload;
        callback(event.payload);

        // Run progress parsing in the frontend for each line
        const pluginId = activeDownloadsPlugins.get(downloadId);
        if (pluginId) {
          const plugin = pluginManager.getPlugin(pluginId);
          if (plugin && plugin.parseProgress) {
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              const progress = plugin.parseProgress(line);
              if (progress) {
                for (const cb of progressCallbacks) {
                  cb({ downloadId, ...progress, status: 'downloading' });
                }
              }
            }
          }
        }
      }).then(fn => { unsub = fn; });
      return () => { if (unsub) unsub(); };
    },

    onOsThemeChanged: (callback: any) => {
      return () => {};
    },

    openSettingsWindow: () => invoke('open_settings_window'),

    focusMainWindow: () => invoke('focus_main_window'),

    emitSettingsChanged: (settings: any) => {
      emit('settings-changed', settings);
    },

    onSettingsChanged: (callback: any) => {
      let unsub: any;
      listen<any>('settings-changed', (event) => {
        callback(event.payload);
      }).then(fn => { unsub = fn; });
      return () => { if (unsub) unsub(); };
    },

    emitNavigateMain: (data: { tab: string; pluginId?: string | null }) => {
      emit('navigate-main', data);
    },

    onNavigateMain: (callback: any) => {
      let unsub: any;
      listen<any>('navigate-main', (event) => {
        callback(event.payload);
      }).then(fn => { unsub = fn; });
      return () => { if (unsub) unsub(); };
    },

    onCheckForUpdatesMenu: (callback: any) => {
      let unsub: any;
      listen<any>('check-for-updates-menu', () => {
        callback();
      }).then(fn => { unsub = fn; });
      return () => { if (unsub) unsub(); };
    },
  };
};

const activeDownloadsPlugins = new Map<string, string>();
const progressCallbacks = new Set<any>();
