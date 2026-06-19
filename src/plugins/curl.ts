const path = {
  join: (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/')
};

const FILE_EXT = /\.(mp4|mkv|webm|mov|avi|flv|mp3|m4a|aac|flac|wav|ogg|opus|zip|rar|7z|pdf|jpg|jpeg|png|gif|webp|apk|dmg|exe|iso|gz|tar)(\?|#|$)/i;
const STREAM = /\.(m3u8|mpd)(\?|#|$)|^rtmps?:|^rtsp:/i;

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    return base || 'download';
  } catch {
    return 'download';
  }
}

export default {
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

  async checkDependency(config: any) {
    const bin = config.curlPath || 'curl';
    try {
      const res = await window.api.execCommand(bin, ['--version']);
      const m = res.stdout.match(/curl\s+([\d.]+)/i);
      return { available: res.success, version: m ? m[1] : res.stdout.split('\n')[0] };
    } catch {
      return { available: false, version: '' };
    }
  },

  configSchema: [
    { key: 'curlPath', label: 'curl binary path', type: 'text', default: 'curl', placeholder: '/usr/bin/curl', help: "Path to the curl executable. Leave as 'curl' if it's on your PATH." },
  ],

  canHandle(url: string) {
    if (STREAM.test(url)) return false;
    return FILE_EXT.test(url);
  },

  getInfo(url: string, config: any) {
    const name = filenameFromUrl(url);
    return Promise.resolve({
      success: true,
      data: {
        title: name,
        thumbnail: '',
        thumbnails: [],
        duration: 0,
        uploader: '',
        channel: '',
        view_count: null,
        formats: [],
        _plugin: 'curl',
        _downloadOptions: [
          { key: 'filename', label: 'Save as', type: 'text', default: name, placeholder: name, help: "curl saves the file as-is; it does not convert formats. Change the name/extension only." },
        ],
      },
    });
  },

  buildDownloadArgs(url: string, options: any, config: any) {
    const bin = config.curlPath || 'curl';
    const name = (options.pluginOptions && options.pluginOptions.filename) || filenameFromUrl(url);
    const out = path.join(options.downloadFolder || '.', name);
    const args = ['-L', '--create-dirs'];
    if (options.resume) args.push('-C', '-');
    args.push('-o', out, url);
    if (options.speedLimit || config.speedLimit) {
      args.push('--limit-rate', options.speedLimit || config.speedLimit);
    }
    return { binary: bin, args };
  },

  parseProgress(line: string) {
    const m = line.match(/^\s*(\d{1,3})\b/);
    if (!m) return null;
    const pct = parseInt(m[1], 10);
    if (Number.isNaN(pct) || pct > 100) return null;
    return { percent: pct, size: '', speed: '', eta: '' };
  },
};
