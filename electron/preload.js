const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // System
  platform: process.platform,   // 'darwin' | 'win32' | 'linux'
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDefaultDownloadsFolder: () => ipcRenderer.invoke('get-default-downloads-folder'),
  openFolder: (p) => ipcRenderer.invoke('open-folder', p),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Media info & download
  getVideoInfo: (url, pluginId) => ipcRenderer.invoke('get-video-info', url, pluginId),
  startDownload: (downloadId, url, options) => ipcRenderer.invoke('start-download', downloadId, url, options),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),
  pauseDownload: (downloadId) => ipcRenderer.invoke('pause-download', downloadId),
  resumeDownload: (downloadId) => ipcRenderer.invoke('resume-download', downloadId),
  getDiskFree: () => ipcRenderer.invoke('get-disk-free'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getPluginConfigs: () => ipcRenderer.invoke('get-plugin-configs'),
  savePluginConfigs: (configs) => ipcRenderer.invoke('save-plugin-configs', configs),

  // Plugin management
  setPluginEnabled: (pluginId, enabled) => ipcRenderer.invoke('set-plugin-enabled', pluginId, enabled),
  importPluginFile: (filePath) => ipcRenderer.invoke('import-plugin-file', filePath),
  browsePluginFile: () => ipcRenderer.invoke('browse-plugin-file'),
  openPluginsDir: () => ipcRenderer.invoke('open-plugins-dir'),

  // Theme management
  getThemes: () => ipcRenderer.invoke('get-themes'),
  getActiveTheme: () => ipcRenderer.invoke('get-active-theme'),
  setActiveTheme: (themeId) => ipcRenderer.invoke('set-active-theme', themeId),
  saveThemeSettings: (themeSettings) => ipcRenderer.invoke('save-theme-settings', themeSettings),
  importThemeFile: (filePath) => ipcRenderer.invoke('import-theme-file', filePath),
  browseThemeFile: () => ipcRenderer.invoke('browse-theme-file'),
  openThemesDir: () => ipcRenderer.invoke('open-themes-dir'),

  // Download event listeners
  onDownloadProgress: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('download-progress', sub);
    return () => ipcRenderer.removeListener('download-progress', sub);
  },
  onDownloadComplete: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('download-complete', sub);
    return () => ipcRenderer.removeListener('download-complete', sub);
  },
  onDownloadError: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('download-error', sub);
    return () => ipcRenderer.removeListener('download-error', sub);
  },
  onDownloadLog: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('download-log', sub);
    return () => ipcRenderer.removeListener('download-log', sub);
  },
});
