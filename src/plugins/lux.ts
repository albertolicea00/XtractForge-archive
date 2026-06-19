const HANDLED_SITES = [
  'bilibili.com', 'douyin.com', 'kuaishou.com', 'weibo.com',
  'mgtv.com', 'iqiyi.com', 'youku.com', 'v.qq.com', 'acfun.cn',
  'huya.com', 'douyu.com', 'youtube.com', 'youtu.be',
  'twitter.com', 'x.com', 'instagram.com',
];

export default {
  id: 'lux',
  name: 'Lux',
  order: 6,
  tag: 'Asian sites',
  description: 'Fast media downloader for Bilibili, Douyin, Kuaishou, and more',
  type: 'downloader',
  icon: '🐉',
  repoUrl: 'https://github.com/iawia002/lux',
  installHint: 'go install github.com/iawia002/lux@latest  OR  brew install lux',
  install: {
    darwin: 'brew install lux',
    win32: 'scoop install lux',
    linux: 'go install github.com/iawia002/lux@latest',
    default: 'go install github.com/iawia002/lux@latest',
  },
  locales: {
    es: {
      tag: 'Sitios asiáticos',
      description: 'Descargador rápido para Bilibili, Douyin, Kuaishou y más',
      fields: {
        luxPath: { label: 'Ruta del binario lux', help: 'Ruta al ejecutable de lux. Déjalo por defecto si está en el PATH.' },
        luxCookie: { label: 'Cookie (opcional)', help: 'Cookie para sitios que requieren inicio de sesión.' },
        luxMultiThread: { label: 'Descarga multihilo', help: 'Descarga con varios hilos para más velocidad. Algunos sitios la rechazan.' },
      },
    },
  },

  configSchema: [
    { key: 'luxPath', label: 'lux binary path', type: 'text', default: 'lux', placeholder: '/usr/local/bin/lux', help: "Path to the lux executable. Leave as default if it's on your PATH." },
    { key: 'luxCookie', label: 'Cookie string (optional)', type: 'text', default: '', placeholder: 'Cookie for authenticated downloads', help: 'Raw cookie string for sites that require login to access content.' },
    { key: 'luxMultiThread', label: 'Multi-thread download', type: 'toggle', default: false, help: 'Download with multiple threads for higher speed. May be rejected by some sites.' },
  ],

  async checkDependency(config: any) {
    const bin = config.luxPath || 'lux';
    try {
      const res = await window.api.execCommand(bin, ['--version']);
      return { available: res.success, version: res.stdout.trim().split('\n')[0] };
    } catch {
      return { available: false, version: '' };
    }
  },

  canHandle(url: string) {
    return HANDLED_SITES.some(site => url.includes(site));
  },

  async getInfo(url: string, config: any) {
    const bin = config.luxPath || 'lux';
    const args = ['-j', url];
    try {
      const res = await window.api.execCommand(bin, args);
      if (res.success) {
        const rawArr = JSON.parse(res.stdout);
        const raw = Array.isArray(rawArr) ? rawArr[0] : rawArr;
        const streams = Object.entries(raw.streams || {});
        const formats = streams.map(([id, s]: [string, any]) => ({
          format_id: id,
          ext: s.ext || 'mp4',
          resolution: s.quality || 'unknown',
          filesize: s.size || null,
          filesize_approx: null,
          fps: null,
          format_note: s.quality || id,
          vcodec: 'unknown',
        }));
        return {
          success: true,
          data: {
            title: raw.title || 'Untitled',
            thumbnail: raw.thumbnail || '',
            thumbnails: raw.thumbnail ? [{ url: raw.thumbnail }] : [],
            duration: 0,
            uploader: raw.author || '',
            channel: raw.author || '',
            view_count: null,
            formats,
            _plugin: 'lux',
            _raw: raw,
          },
        };
      } else {
        throw new Error(res.stderr || `lux exited with error`);
      }
    } catch (e: any) {
      throw new Error(`Failed to run lux: ${e.message}`);
    }
  },

  buildDownloadArgs(url: string, options: any, config: any) {
    const bin = config.luxPath || 'lux';
    const args = [];

    args.push('-o', options.downloadFolder || '.');

    if (options.format && options.format !== 'best') {
      args.push('-f', options.format);
    }

    if (config.luxCookie) {
      args.push('-c', config.luxCookie);
    }

    if (config.luxMultiThread) {
      args.push('-m');
    }

    args.push(url);
    return { binary: bin, args };
  },

  parseProgress(line: string) {
    const pctMatch = /([\d.]+)%/.exec(line);
    if (!pctMatch) return null;
    const speedMatch = /([\d.]+\s*\w+\/s)/i.exec(line);
    return {
      percent: parseFloat(pctMatch[1]),
      size: '',
      speed: speedMatch ? speedMatch[1] : '',
      eta: '',
    };
  },
};
