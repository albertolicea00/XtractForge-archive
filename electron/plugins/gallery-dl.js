const { spawn, execSync } = require('child_process');

const HANDLED_SITES = [
  'deviantart.com', 'pixiv.net', 'danbooru.donmai.us', 'artstation.com',
  'flickr.com', 'reddit.com', 'instagram.com', 'twitter.com', 'x.com',
  'tumblr.com', 'gelbooru.com', 'rule34.xxx', 'sankakucomplex.com',
  'nijie.info', 'seiga.nicovideo.jp', 'pinterest.com', 'patreon.com',
  'furaffinity.net', 'e621.net', 'newgrounds.com', 'imgur.com',
];

module.exports = {
  id: 'gallery-dl',
  name: 'gallery-dl',
  description: 'Download image galleries from DeviantArt, Pixiv, Reddit, Instagram, Danbooru, and more',
  type: 'downloader',
  icon: '🖼',
  repoUrl: 'https://github.com/mikf/gallery-dl',
  installHint: 'pip install gallery-dl  OR  brew install gallery-dl',

  configSchema: [
    { key: 'galleryDlPath', label: 'gallery-dl binary path', type: 'text', default: 'gallery-dl', placeholder: '/usr/local/bin/gallery-dl' },
    { key: 'galleryDlCookies', label: 'Cookies file (optional)', type: 'text', default: '', placeholder: '/path/to/cookies.txt' },
    { key: 'galleryDlConfig', label: 'Config file (optional)', type: 'text', default: '', placeholder: '/path/to/gallery-dl.conf' },
  ],

  checkDependency(config) {
    const bin = config.galleryDlPath || 'gallery-dl';
    try {
      const out = execSync(`"${bin}" --version`, { encoding: 'utf8', timeout: 3000 });
      return { available: true, version: out.trim() };
    } catch {
      return { available: false, version: '' };
    }
  },

  canHandle(url) {
    return HANDLED_SITES.some(site => url.includes(site));
  },

  // gallery-dl has no clean JSON info mode — synthesize a stub
  getInfo(url, config) {
    const slug = url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/').slice(-2).join('/');
    const site = HANDLED_SITES.find(s => url.includes(s)) || 'gallery';
    return Promise.resolve({
      success: true,
      data: {
        title: slug || 'Gallery Download',
        thumbnail: '',
        thumbnails: [],
        duration: 0,
        uploader: site,
        channel: site,
        view_count: null,
        formats: [
          {
            format_id: 'original',
            ext: 'images',
            resolution: 'Original Quality',
            filesize: null,
            format_note: 'All images — gallery-dl will download every item in the gallery',
            vcodec: 'none',
          },
        ],
        _plugin: 'gallery-dl',
        _isGallery: true,
      },
    });
  },

  buildDownloadArgs(url, options, config) {
    const bin = config.galleryDlPath || 'gallery-dl';
    const args = [];

    args.push('-d', options.downloadFolder || '.');

    if (config.galleryDlCookies) {
      args.push('--cookies', config.galleryDlCookies);
    }

    if (config.galleryDlConfig) {
      args.push('--config', config.galleryDlConfig);
    }

    args.push(url);
    return { binary: bin, args };
  },

  parseProgress(line) {
    // gallery-dl: "#0042 https://..."
    const countMatch = /#(\d+)/.exec(line);
    if (!countMatch) return null;
    return {
      percent: 0,
      size: '',
      speed: '',
      eta: '',
      fileCount: parseInt(countMatch[1], 10),
    };
  },
};
