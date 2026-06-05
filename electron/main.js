const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow;
const activeDownloads = new Map();
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// Default configuration settings
let config = {
  ytdlpPath: 'yt-dlp',
  ffmpegPath: 'ffmpeg',
  downloadFolder: app.getPath('downloads'),
  maxConcurrent: 3,
  speedLimit: '',
  embedSubtitles: false,
  sponsorBlock: false,
  defaultFormat: 'bestvideo+bestaudio/best',
};

// Load config from file
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      config = { ...config, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

// Save config to file
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

function createWindow() {
  loadConfig();
  
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // beautiful native mac top bar, if on mac
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0c0c0e',
  });

  // Load Vite Dev Server in development, local files in production
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Kill any remaining active downloads when app closes
    for (const [id, proc] of activeDownloads.entries()) {
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Check if yt-dlp and ffmpeg are available
ipcMain.handle('check-dependencies', () => {
  const status = { ytdlp: false, ffmpeg: false, ytdlpVersion: '', ffmpegVersion: '' };
  
  // Check yt-dlp
  try {
    const ytdlpBin = config.ytdlpPath || 'yt-dlp';
    const out = execSync(`"${ytdlpBin}" --version`, { encoding: 'utf8', timeout: 3000 });
    status.ytdlp = true;
    status.ytdlpVersion = out.trim();
  } catch (e) {
    status.ytdlp = false;
  }

  // Check ffmpeg
  try {
    const ffmpegBin = config.ffmpegPath || 'ffmpeg';
    const out = execSync(`"${ffmpegBin}" -version`, { encoding: 'utf8', timeout: 3000 });
    status.ffmpeg = true;
    status.ffmpegVersion = out.split('\n')[0].trim();
  } catch (e) {
    status.ffmpeg = false;
  }

  return status;
});

// IPC Handler: Select download folder
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

// IPC Handler: Get default downloads folder
ipcMain.handle('get-default-downloads-folder', () => {
  return config.downloadFolder;
});

// IPC Handler: Get video information via yt-dlp --dump-json
ipcMain.handle('get-video-info', async (event, url) => {
  return new Promise((resolve, reject) => {
    const ytdlpBin = config.ytdlpPath || 'yt-dlp';
    // Use --dump-single-json to avoid issues with playlists
    // We also restrict playlist items or grab the flat version to keep it speedy
    const args = ['--dump-single-json', '--flat-playlist', url];
    
    let stdoutData = '';
    let stderrData = '';
    
    const proc = spawn(ytdlpBin, args);
    
    proc.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdoutData);
          resolve({ success: true, data: info });
        } catch (e) {
          reject(new Error('Failed to parse video info: ' + e.message));
        }
      } else {
        reject(new Error(stderrData.trim() || `yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to execute yt-dlp: ${err.message}`));
    });
  });
});

// IPC Handler: Cancel active download
ipcMain.handle('cancel-download', (event, downloadId) => {
  const proc = activeDownloads.get(downloadId);
  if (proc) {
    proc.kill('SIGTERM');
    activeDownloads.delete(downloadId);
    return true;
  }
  return false;
});

// IPC Handler: Open download folder in finder/explorer
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

// IPC Handler: Start Download
ipcMain.handle('start-download', async (event, downloadId, url, options) => {
  const ytdlpBin = config.ytdlpPath || 'yt-dlp';
  const outFolder = options.downloadFolder || config.downloadFolder;
  
  // Assemble arguments
  const args = [];
  
  // Output template
  args.push('-o', path.join(outFolder, '%(title)s.%(ext)s'));
  
  // Speed limit
  if (options.speedLimit || config.speedLimit) {
    args.push('-r', options.speedLimit || config.speedLimit);
  }
  
  // Format selection
  if (options.format) {
    args.push('-f', options.format);
  } else if (options.audioOnly) {
    args.push('-x', '--audio-format', options.audioFormat || 'mp3');
  } else {
    args.push('-f', config.defaultFormat);
  }
  
  // Subtitles
  if (options.embedSubtitles || config.embedSubtitles) {
    args.push('--embed-subs', '--all-subs');
  }
  
  // SponsorBlock
  if (options.sponsorBlock || config.sponsorBlock) {
    args.push('--sponsorblock-remove', 'all');
  }
  
  // URL
  args.push(url);
  
  console.log(`Starting download ${downloadId} with command: ${ytdlpBin} ${args.join(' ')}`);
  
  const proc = spawn(ytdlpBin, args);
  activeDownloads.set(downloadId, proc);
  
  // Regex to extract progress information from yt-dlp stdout
  // e.g. [download]  12.3% of ~50.23MiB at  3.45MiB/s ETA 00:12
  const progressRegex = /\[download\]\s+([\d.]+)% of\s+(?:~\s*)?([\d.]+\w+) at\s+([\d.]+\w+\/s) ETA\s+([\d:]+)/;
  
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      const match = progressRegex.exec(line);
      if (match) {
        const percent = parseFloat(match[1]);
        const size = match[2];
        const speed = match[3];
        const eta = match[4];
        
        mainWindow.webContents.send('download-progress', {
          downloadId,
          percent,
          size,
          speed,
          eta,
          status: 'downloading'
        });
      }
    }
  });

  proc.stderr.on('data', (data) => {
    // yt-dlp sometimes sends warnings or errors to stderr
    console.warn(`[Download ID: ${downloadId} stderr]: ${data.toString()}`);
  });
  
  proc.on('close', (code) => {
    activeDownloads.delete(downloadId);
    if (code === 0) {
      mainWindow.webContents.send('download-complete', {
        downloadId,
        status: 'completed'
      });
    } else {
      mainWindow.webContents.send('download-error', {
        downloadId,
        status: 'error',
        error: `yt-dlp exited with code ${code}`
      });
    }
  });

  proc.on('error', (err) => {
    activeDownloads.delete(downloadId);
    mainWindow.webContents.send('download-error', {
      downloadId,
      status: 'error',
      error: err.message
    });
  });
  
  return true;
});
