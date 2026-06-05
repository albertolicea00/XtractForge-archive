const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
  startDownload: (downloadId, url, options) => ipcRenderer.invoke('start-download', downloadId, url, options),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  getDefaultDownloadsFolder: () => ipcRenderer.invoke('get-default-downloads-folder'),
  
  // Listeners for progress and state updates
  onDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },
  onDownloadComplete: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download-complete', subscription);
    return () => ipcRenderer.removeListener('download-complete', subscription);
  },
  onDownloadError: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download-error', subscription);
    return () => ipcRenderer.removeListener('download-error', subscription);
  }
});
