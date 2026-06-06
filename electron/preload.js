const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // System
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDefaultDownloadsFolder: () => ipcRenderer.invoke('get-default-downloads-folder'),
  openFolder: (p) => ipcRenderer.invoke('open-folder', p),

  // Media info & download
  getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
  startDownload: (downloadId, url, options) => ipcRenderer.invoke('start-download', downloadId, url, options),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),

  // Settings
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getPluginConfigs: () => ipcRenderer.invoke('get-plugin-configs'),
  savePluginConfigs: (configs) => ipcRenderer.invoke('save-plugin-configs', configs),

  // Plugin management
  setPluginEnabled: (pluginId, enabled) => ipcRenderer.invoke('set-plugin-enabled', pluginId, enabled),
  importPluginFile: (filePath) => ipcRenderer.invoke('import-plugin-file', filePath),
  browsePluginFile: () => ipcRenderer.invoke('browse-plugin-file'),
  openPluginsDir: () => ipcRenderer.invoke('open-plugins-dir'),

  // Ollama AI discovery
  ollamaSearch: (query) => ipcRenderer.invoke('ollama-search', query),

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
});
