const { spawn, execSync } = require('child_process');

const HANDLED_SITES = [
  'bilibili.com', 'youku.com', 'iqiyi.com', 'weibo.com', 'mgtv.com',
  'acfun.cn', 'douyin.com', 'kuaishou.com', 'v.qq.com', 'le.com',
  'sohu.com', 'huya.com', 'douyu.com', 'panda.tv',
];

module.exports = {
  id: 'annie',
  name: 'Annie',
  description: 'Download from Bilibili, Youku, iQiyi, Weibo, and Chinese/Asian platforms',
  type: 'downloader',
  icon: '🎬',
  repoUrl: 'https://github.com/iawia002/annie',
  installHint: 'go install github.com/iawia002/annie@latest  OR  brew install annie',

  configSchema: [
    { key: 'anniePath', label: 'annie binary path', type: 'text', default: 'annie', placeholder: '/usr/local/bin/annie' },
    { key: 'annieCookie', label: 'Cookie string (optional)', type: 'text', default: '', placeholder: 'For authenticated downloads' },
  ],

  checkDependency(config) {
    const bin = config.anniePath || 'annie';
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
      const bin = config.anniePath || 'annie';
      const args = ['-j', url];
      let stdout = '';
      let stderr = '';
      const proc = spawn(bin, args);
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', code => {
        if (code === 0) {
          try {
            const raw = JSON.parse(stdout);
            const streams = Object.entries(raw.Streams || {});
            const formats = streams.map(([id, s]) => ({
              format_id: id,
              ext: s.Ext || 'mp4',
              resolution: s.Quality || 'unknown',
              filesize: s.Size || null,
              filesize_approx: null,
              fps: null,
              format_note: s.Quality || id,
              vcodec: 'unknown',
            }));
            resolve({
              success: true,
              data: {
                title: raw.Title || 'Untitled',
                thumbnail: raw.Thumbnail || '',
                thumbnails: raw.Thumbnail ? [{ url: raw.Thumbnail }] : [],
                duration: 0,
                uploader: raw.Author || '',
                channel: raw.Author || '',
                view_count: null,
                formats,
                _plugin: 'annie',
                _raw: raw,
              },
            });
          } catch (e) {
            reject(new Error('Failed to parse annie output: ' + e.message));
          }
        } else {
          reject(new Error(stderr.trim() || `annie exited with code ${code}`));
        }
      });
      proc.on('error', err => reject(new Error(`Failed to run annie: ${err.message}`)));
    });
  },

  buildDownloadArgs(url, options, config) {
    const bin = config.anniePath || 'annie';
    const args = [];

    args.push('-o', options.downloadFolder || '.');

    if (options.format && options.format !== 'best') {
      args.push('-f', options.format);
    }

    if (config.annieCookie) {
      args.push('-c', config.annieCookie);
    }

    args.push(url);
    return { binary: bin, args };
  },

  parseProgress(line) {
    // annie: "Downloading xxx 100.00 KiB/12.34 MiB 100.00% 1.23 MiB/s"
    const pctMatch = /([\d.]+)%/.exec(line);
    const speedMatch = /([\d.]+\s*\w+\/s)/.exec(line);
    if (!pctMatch) return null;
    return {
      percent: parseFloat(pctMatch[1]),
      size: '',
      speed: speedMatch ? speedMatch[1] : '',
      eta: '',
    };
  },
};
