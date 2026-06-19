const HANDLED_SITES = [
  'deviantart.com', 'pixiv.net', 'danbooru.donmai.us', 'artstation.com',
  'flickr.com', 'reddit.com', 'instagram.com', 'twitter.com', 'x.com',
  'tumblr.com', 'gelbooru.com', 'rule34.xxx', 'sankakucomplex.com',
  'nijie.info', 'seiga.nicovideo.jp', 'pinterest.com', 'patreon.com',
  'furaffinity.net', 'e621.net', 'newgrounds.com', 'imgur.com',
];

export default {
  id: 'gallery-dl',
  name: 'gallery-dl',
  order: 4,
  tag: 'Images',
  description: 'Download image galleries from DeviantArt, Pixiv, Reddit, Instagram, and more',
  type: 'downloader',
  icon: '🖼',
  repoUrl: 'https://github.com/mikf/gallery-dl',
  installHint: 'pip install gallery-dl  OR  brew install gallery-dl',
  install: {
    darwin: 'brew install gallery-dl',
    win32: 'pip install gallery-dl',
    linux: 'pipx install gallery-dl',
    default: 'pip install gallery-dl',
  },
  locales: {
    es: {
      tag: 'Imágenes',
      description: 'Descarga galerías de imágenes de DeviantArt, Pixiv, Reddit, Instagram y más',
      fields: {
        galleryDlPath: { label: 'Ruta del binario gallery-dl', help: 'Ruta al ejecutable de gallery-dl. Déjalo por defecto si está en el PATH.' },
        galleryDlCookies: { label: 'Archivo de cookies (opcional)', help: 'Ruta a un cookies.txt. Necesario para sitios que requieren inicio de sesión.' },
        galleryDlConfig: { label: 'Archivo de configuración (opcional)', help: 'Ruta a un archivo de configuración propio de gallery-dl para opciones avanzadas.' },
      },
    },
  },

  configSchema: [
    { key: 'galleryDlPath', label: 'gallery-dl binary path', type: 'text', default: 'gallery-dl', placeholder: '/usr/local/bin/gallery-dl', help: "Path to the gallery-dl executable. Leave as default if it's on your PATH." },
    { key: 'galleryDlCookies', label: 'Cookies file (optional)', type: 'text', default: '', placeholder: '/path/to/cookies.txt', help: 'Path to a cookies.txt file. Required for sites that need login (e.g. private galleries).' },
    { key: 'galleryDlConfig', label: 'Config file (optional)', type: 'text', default: '', placeholder: '/path/to/gallery-dl.conf', help: 'Path to a custom gallery-dl config file for advanced per-site options.' },
  ],

  async checkDependency(config: any) {
    const bin = config.galleryDlPath || 'gallery-dl';
    try {
      const res = await window.api.execCommand(bin, ['--version']);
      return { available: res.success, version: res.stdout.trim() };
    } catch {
      return { available: false, version: '' };
    }
  },

  canHandle(url: string) {
    return HANDLED_SITES.some(site => url.includes(site));
  },

  getInfo(url: string, config: any) {
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

  buildDownloadArgs(url: string, options: any, config: any) {
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

  parseProgress(line: string) {
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
