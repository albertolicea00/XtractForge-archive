const { spawn, execSync } = require('child_process');

const HANDLED_SITES = [
  'bilibili.com', 'douyin.com', 'kuaishou.com', 'weibo.com',
  'mgtv.com', 'iqiyi.com', 'youku.com', 'v.qq.com', 'acfun.cn',
  'huya.com', 'douyu.com', 'youtube.com', 'youtu.be',
  'twitter.com', 'x.com', 'instagram.com',
];

module.exports = {
  id: 'lux',
  name: 'Lux',
  order: 4,
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

  configSchema: [
    { key: 'luxPath', label: 'lux binary path', type: 'text', default: 'lux', placeholder: '/usr/local/bin/lux', help: "Path to the lux executable. Leave as default if it's on your PATH." },
    { key: 'luxCookie', label: 'Cookie string (optional)', type: 'text', default: '', placeholder: 'Cookie for authenticated downloads', help: 'Raw cookie string for sites that require login to access content.' },
    { key: 'luxMultiThread', label: 'Multi-thread download', type: 'toggle', default: false, help: 'Download with multiple threads for higher speed. May be rejected by some sites.' },
  ],

  checkDependency(config) {
    const bin = config.luxPath || 'lux';
    try {
      const out = execSync(`"${bin}" --version 2>&1`, { encoding: 'utf8', timeout: 3000 });
      return { available: true, version: out.trim().split('\n')[0] };
    } catch {
      return { available: false, version: '' };
    }
  },

  canHandle(url) {
    return HANDLED_SITES.some(site => url.includes(site));
  },

  getInfo(url, config) {
    return new Promise((resolve, reject) => {
      const bin = config.luxPath || 'lux';
      const args = ['-j', url];
      let stdout = '';
      let stderr = '';
      const proc = spawn(bin, args);
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', code => {
        if (code === 0) {
          try {
            // lux -j outputs an array
            const rawArr = JSON.parse(stdout);
            const raw = Array.isArray(rawArr) ? rawArr[0] : rawArr;
            const streams = Object.entries(raw.streams || {});
            const formats = streams.map(([id, s]) => ({
              format_id: id,
              ext: s.ext || 'mp4',
              resolution: s.quality || 'unknown',
              filesize: s.size || null,
              filesize_approx: null,
              fps: null,
              format_note: s.quality || id,
              vcodec: 'unknown',
            }));
            resolve({
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
            });
          } catch (e) {
            reject(new Error('Failed to parse lux output: ' + e.message));
          }
        } else {
          reject(new Error(stderr.trim() || `lux exited with code ${code}`));
        }
      });
      proc.on('error', err => reject(new Error(`Failed to run lux: ${err.message}`)));
    });
  },

  buildDownloadArgs(url, options, config) {
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

  parseProgress(line) {
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
