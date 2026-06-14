const { spawn, execSync } = require('child_process');
const path = require('path');

// Common direct-file extensions curl should grab (not pages, not streams).
const FILE_EXT = /\.(mp4|mkv|webm|mov|avi|flv|mp3|m4a|aac|flac|wav|ogg|opus|zip|rar|7z|pdf|jpg|jpeg|png|gif|webp|apk|dmg|exe|iso|gz|tar)(\?|#|$)/i;
// Streaming manifests are ffmpeg's job, not curl's.
const STREAM = /\.(m3u8|mpd)(\?|#|$)|^rtmps?:|^rtsp:/i;

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const base = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    return base || 'download';
  } catch {
    return 'download';
  }
}

module.exports = {
  id: 'curl',
  name: 'curl',
  order: 1,
  tag: 'Direct file',
  description: 'Download a direct file URL straight to disk (no extraction)',
  type: 'downloader',
  icon: '🔗',
  repoUrl: 'https://curl.se',
  installHint: 'Pre-installed on macOS/Linux  OR  winget install curl.curl',
  install: {
    darwin: 'brew install curl',
    win32: 'winget install curl.curl',
    linux: 'sudo apt install curl',
    default: 'see https://curl.se/download.html',
  },
  locales: {
    es: {
      tag: 'Archivo directo',
      description: 'Descarga una URL de archivo directa al disco (sin extracción)',
    },
  },

  checkDependency(config) {
    const bin = config.curlPath || 'curl';
    try {
      const out = execSync(`"${bin}" --version`, { encoding: 'utf8', timeout: 3000 });
      const m = out.match(/curl\s+([\d.]+)/i);
      return { available: true, version: m ? m[1] : out.split('\n')[0] };
    } catch {
      return { available: false, version: '' };
    }
  },

  configSchema: [
    { key: 'curlPath', label: 'curl binary path', type: 'text', default: 'curl', placeholder: '/usr/bin/curl', help: "Path to the curl executable. Leave as 'curl' if it's on your PATH." },
  ],

  canHandle(url) {
    if (STREAM.test(url)) return false;
    return FILE_EXT.test(url);
  },

  getInfo(url, config) {
    // No metadata service — return a minimal stub so the UI can show a title.
    const title = filenameFromUrl(url);
    return Promise.resolve({
      success: true,
      data: {
        title,
        thumbnail: '',
        thumbnails: [],
        duration: 0,
        uploader: '',
        channel: '',
        view_count: null,
        formats: [],
        _plugin: 'curl',
        _simpleDownload: true,
      },
    });
  },

  buildDownloadArgs(url, options, config) {
    const bin = config.curlPath || 'curl';
    const out = path.join(options.downloadFolder || '.', filenameFromUrl(url));
    // -L follow redirects, -# progress bar, -o output, --create-dirs
    const args = ['-L', '--create-dirs', '-o', out, url];
    if (options.speedLimit || config.speedLimit) {
      args.push('--limit-rate', options.speedLimit || config.speedLimit);
    }
    return { binary: bin, args };
  },

  parseProgress(line) {
    // Default curl meter: "% Total ... " — first integer is the percentage.
    const m = line.match(/^\s*(\d{1,3})\b/);
    if (!m) return null;
    const pct = parseInt(m[1], 10);
    if (Number.isNaN(pct) || pct > 100) return null;
    return { percent: pct, size: '', speed: '', eta: '' };
  },
};
