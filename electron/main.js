const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const pluginManager = require('./plugin-manager');
const themeManager = require('./theme-manager');

let mainWindow;
// activeDownloads stores { proc, pluginId } per downloadId
const activeDownloads = new Map();
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

let config = {
  ytdlpPath: 'yt-dlp',
  ffmpegPath: 'ffmpeg',
  downloadFolder: app.getPath('downloads'),
  maxConcurrent: 3,
  speedLimit: '',
  embedSubtitles: false,
  sponsorBlock: false,
  defaultFormat: 'bestvideo+bestaudio/best',
  plugins: {},
  disabledPlugins: [],
  // Directory where user-installed external plugin .js files are stored
  externalPluginsDir: path.join(app.getPath('userData'), 'plugins'),
  // Theming
  activeTheme: 'cyber-glass',
  themeSettings: { accentOverride: '', glassIntensity: 75, monoFont: false },
  // Directory where user-installed external theme .js files are stored
  externalThemesDir: path.join(app.getPath('userData'), 'themes'),
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      config = { ...config, ...JSON.parse(data) };
      if (!config.plugins) config.plugins = {};
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

function initPlugins() {
  const dir = config.externalPluginsDir || path.join(app.getPath('userData'), 'plugins');
  const results = pluginManager.loadExternalPlugins(dir);
  if (results.length > 0) {
    console.log('[PluginManager] External plugins loaded:', results);
  }
}

function initThemes() {
  const dir = config.externalThemesDir || path.join(app.getPath('userData'), 'themes');
  const results = themeManager.loadExternalThemes(dir);
  if (results.length > 0) {
    console.log('[ThemeManager] External themes loaded:', results);
  }
}

function createWindow() {
  loadConfig();
  initPlugins();
  initThemes();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../icons/AppIcon512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0c0c0e',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    for (const [, { proc }] of activeDownloads.entries()) {
      proc.kill('SIGTERM');
    }
    activeDownloads.clear();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Check all plugin dependencies
ipcMain.handle('check-dependencies', () => {
  return pluginManager.checkAllDependencies(config);
});

// Select download folder
ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: config.downloadFolder,
  });
  if (!result.canceled && result.filePaths.length > 0) {
    config.downloadFolder = result.filePaths[0];
    saveConfig();
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-default-downloads-folder', () => config.downloadFolder);

// Get video/media info — routes to best plugin for the URL
ipcMain.handle('get-video-info', async (event, url) => {
  const plugin = pluginManager.getDownloaderForUrl(url, config.disabledPlugins || []);
  const pluginCfg = pluginManager.getPluginConfig(plugin.id, config);
  const result = await plugin.getInfo(url, pluginCfg);
  // Inject which plugin handled this so the renderer can display it
  if (result.success) result.pluginId = plugin.id;
  return result;
});

// Get global settings (persisted app-wide config) for the renderer to hydrate state
ipcMain.handle('get-settings', () => ({
  ytdlpPath: config.ytdlpPath,
  ffmpegPath: config.ffmpegPath,
  downloadFolder: config.downloadFolder,
  speedLimit: config.speedLimit || '',
  embedSubtitles: !!config.embedSubtitles,
  sponsorBlock: !!config.sponsorBlock,
  disabledPlugins: config.disabledPlugins || [],
}));

// Get plugin-specific settings
ipcMain.handle('get-plugin-configs', () => {
  return config.plugins || {};
});

// Save plugin-specific settings
ipcMain.handle('save-plugin-configs', (event, pluginConfigs) => {
  config.plugins = { ...config.plugins, ...pluginConfigs };
  saveConfig();
  return true;
});

// Save global settings
ipcMain.handle('save-settings', (event, settings) => {
  config = { ...config, ...settings };
  saveConfig();
  return true;
});

// Enable or disable a plugin by id
ipcMain.handle('set-plugin-enabled', (event, pluginId, enabled) => {
  if (!config.disabledPlugins) config.disabledPlugins = [];
  if (enabled) {
    config.disabledPlugins = config.disabledPlugins.filter(id => id !== pluginId);
  } else {
    if (!config.disabledPlugins.includes(pluginId)) {
      config.disabledPlugins.push(pluginId);
    }
  }
  saveConfig();
  return true;
});

// Import an external plugin from an absolute file path
ipcMain.handle('import-plugin-file', (event, filePath) => {
  return pluginManager.loadPluginFile(filePath);
});

// Browse for an external plugin file
ipcMain.handle('browse-plugin-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import XtractForge Plugin',
    filters: [{ name: 'JavaScript Plugin', extensions: ['js'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return pluginManager.loadPluginFile(filePath);
});

// Open the external plugins directory in Finder/Explorer
ipcMain.handle('open-plugins-dir', async () => {
  const dir = config.externalPluginsDir || path.join(app.getPath('userData'), 'plugins');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return dir;
});

// ── Themes ──────────────────────────────────────────────────────────────────

// All registered themes (builtin + external) with their CSS variables
ipcMain.handle('get-themes', () => themeManager.getAllThemes());

// Active theme id + user theme settings (accent, glass intensity, mono font)
ipcMain.handle('get-active-theme', () => ({
  activeTheme: config.activeTheme || 'cyber-glass',
  themeSettings: config.themeSettings || { accentOverride: '', glassIntensity: 75, monoFont: false },
}));

// Switch the active theme by id
ipcMain.handle('set-active-theme', (event, themeId) => {
  if (themeManager.getTheme(themeId)) {
    config.activeTheme = themeId;
    saveConfig();
    return true;
  }
  return false;
});

// Persist user theme settings (accentOverride, glassIntensity, monoFont)
ipcMain.handle('save-theme-settings', (event, themeSettings) => {
  config.themeSettings = { ...(config.themeSettings || {}), ...themeSettings };
  saveConfig();
  return true;
});

// Import an external theme from an absolute file path
ipcMain.handle('import-theme-file', (event, filePath) => {
  return themeManager.loadThemeFile(filePath);
});

// Browse for an external theme file
ipcMain.handle('browse-theme-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import XtractForge Theme',
    filters: [{ name: 'JavaScript Theme', extensions: ['js'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return themeManager.loadThemeFile(result.filePaths[0]);
});

// Open the external themes directory in Finder/Explorer
ipcMain.handle('open-themes-dir', async () => {
  const dir = config.externalThemesDir || path.join(app.getPath('userData'), 'themes');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return dir;
});

// Cancel download
ipcMain.handle('cancel-download', (event, downloadId) => {
  const entry = activeDownloads.get(downloadId);
  if (entry) {
    entry.proc.kill('SIGTERM');
    activeDownloads.delete(downloadId);
    return true;
  }
  return false;
});

// Pause a running download (SIGSTOP). Not supported on Windows.
ipcMain.handle('pause-download', (event, downloadId) => {
  const entry = activeDownloads.get(downloadId);
  if (entry && process.platform !== 'win32') {
    try { entry.proc.kill('SIGSTOP'); entry.paused = true; return true; } catch { return false; }
  }
  return false;
});

// Resume a paused download (SIGCONT).
ipcMain.handle('resume-download', (event, downloadId) => {
  const entry = activeDownloads.get(downloadId);
  if (entry && process.platform !== 'win32') {
    try { entry.proc.kill('SIGCONT'); entry.paused = false; return true; } catch { return false; }
  }
  return false;
});

// Free disk space (bytes) on the volume holding the download folder
ipcMain.handle('get-disk-free', () => {
  try {
    const stats = fs.statfsSync(config.downloadFolder || app.getPath('downloads'));
    return stats.bavail * stats.bsize;
  } catch {
    return null;
  }
});

// Open an external URL in the default browser
ipcMain.handle('open-external', async (event, targetUrl) => {
  if (typeof targetUrl !== 'string' || !/^https?:\/\//i.test(targetUrl)) return false;
  await shell.openExternal(targetUrl);
  return true;
});

// Open folder in OS file explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    const targetPath = folderPath || config.downloadFolder;
    if (fs.existsSync(targetPath)) {
      await shell.openPath(targetPath);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to open folder:', e);
    return false;
  }
});

// Start a download — routes to the plugin that handled the URL's getInfo
ipcMain.handle('start-download', async (event, downloadId, url, options) => {
  const pluginId = options.pluginId || 'yt-dlp';
  const plugin = pluginManager.getPlugin(pluginId) || pluginManager.getPlugin('yt-dlp');
  const pluginCfg = pluginManager.getPluginConfig(plugin.id, config);

  const downloadOptions = {
    ...options,
    downloadFolder: options.downloadFolder || config.downloadFolder,
    speedLimit: options.speedLimit || config.speedLimit,
    embedSubtitles: options.embedSubtitles ?? config.embedSubtitles,
    sponsorBlock: options.sponsorBlock ?? config.sponsorBlock,
  };

  const { binary, args } = plugin.buildDownloadArgs(url, downloadOptions, pluginCfg);

  console.log(`[${plugin.id}] Starting download ${downloadId}: ${binary} ${args.join(' ')}`);

  const proc = spawn(binary, args);
  activeDownloads.set(downloadId, { proc, pluginId: plugin.id });

  const handleStream = (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      const progress = plugin.parseProgress(line);
      if (progress && mainWindow) {
        mainWindow.webContents.send('download-progress', { downloadId, ...progress, status: 'downloading' });
      }
    }
    // Stream raw console output to the renderer for the expandable log view
    if (mainWindow && text.trim()) {
      mainWindow.webContents.send('download-log', { downloadId, chunk: text });
    }
  };

  proc.stdout.on('data', handleStream);
  proc.stderr.on('data', (data) => {
    handleStream(data);
    console.warn(`[${plugin.id} stderr]: ${data.toString()}`);
  });

  proc.on('close', (code) => {
    activeDownloads.delete(downloadId);
    if (!mainWindow) return;
    if (code === 0) {
      mainWindow.webContents.send('download-complete', { downloadId, status: 'completed' });
    } else {
      mainWindow.webContents.send('download-error', { downloadId, status: 'error', error: `${plugin.name} exited with code ${code}` });
    }
  });

  proc.on('error', (err) => {
    activeDownloads.delete(downloadId);
    if (mainWindow) {
      mainWindow.webContents.send('download-error', { downloadId, status: 'error', error: err.message });
    }
  });

  return true;
});
