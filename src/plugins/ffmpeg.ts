const path = {
  join: (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/')
};

const STREAM = /\.(m3u8|mpd)(\?|#|$)|^rtmps?:\/\/|^rtsp:\/\//i;

function nameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = (u.pathname.split('/').filter(Boolean).pop() || 'stream').replace(/\.(m3u8|mpd)$/i, '');
    return base || 'stream';
  } catch {
    return 'stream';
  }
}

export default {
  id: 'ffmpeg',
  name: 'FFmpeg',
  order: 2,
  tag: 'Streams',
  description: 'Record HLS (m3u8), DASH (mpd), and RTMP/RTSP live streams to a file',
  type: 'downloader',
  icon: '🎞️',
  repoUrl: 'https://ffmpeg.org',
  installHint: 'brew install ffmpeg  OR  see https://ffmpeg.org/download.html',
  install: {
    darwin: 'brew install ffmpeg',
    win32: 'win32: winget install Gyan.FFmpeg',
    linux: 'sudo apt install ffmpeg',
    default: 'see https://ffmpeg.org/download.html',
  },
  locales: {
    es: {
      tag: 'Streams',
      description: 'Graba streams HLS (m3u8), DASH (mpd) y en vivo RTMP/RTSP a un archivo',
      fields: {
        ffmpegPath: { label: 'Ruta del binario ffmpeg', help: 'Ruta al ejecutable de ffmpeg. Déjalo por defecto si está en el PATH.' },
        ffmpegContainer: { label: 'Contenedor de salida', help: 'Formato del archivo grabado. mp4 es lo más compatible.' },
      },
    },
  },

  async checkDependency(config: any) {
    const bin = config.ffmpegPath || 'ffmpeg';
    try {
      const res = await window.api.execCommand(bin, ['-version']);
      const m = res.stdout.match(/ffmpeg version (\S+)/i);
      return { available: res.success, version: m ? m[1] : res.stdout.split('\n')[0] };
    } catch {
      return { available: false, version: '' };
    }
  },

  configSchema: [
    { key: 'ffmpegPath', label: 'ffmpeg binary path', type: 'text', default: 'ffmpeg', placeholder: '/usr/local/bin/ffmpeg', help: "Path to the ffmpeg executable. Leave as 'ffmpeg' if it's on your PATH." },
    { key: 'ffmpegContainer', label: 'Output container', type: 'select', default: 'mp4', options: ['mp4', 'mkv', 'ts'], help: 'File format for the recorded stream. mp4 is the most compatible.' },
  ],

  canHandle(url: string) {
    return STREAM.test(url);
  },

  getInfo(url: string, config: any) {
    return Promise.resolve({
      success: true,
      data: {
        title: nameFromUrl(url),
        thumbnail: '',
        thumbnails: [],
        duration: 0,
        uploader: '',
        channel: '',
        view_count: null,
        formats: [],
        _plugin: 'ffmpeg',
        _downloadOptions: [
          { key: 'container', label: 'Output container', type: 'select', default: config.ffmpegContainer || 'mp4', options: ['mp4', 'mkv', 'ts'], help: 'File format for the recorded stream. mp4 is the most compatible.' },
        ],
      },
    });
  },

  buildDownloadArgs(url: string, options: any, config: any) {
    const bin = config.ffmpegPath || 'ffmpeg';
    const container = (options.pluginOptions && options.pluginOptions.container) || config.ffmpegContainer || 'mp4';
    const out = path.join(options.downloadFolder || '.', `${nameFromUrl(url)}.${container}`);
    const args = ['-y', '-stats', '-i', url, '-c', 'copy'];
    if (container === 'mp4') args.push('-bsf:a', 'aac_adtstoasc');
    args.push(out);
    return { binary: bin, args };
  },

  parseProgress(line: string) {
    const time = line.match(/time=(\d{2}:\d{2}:\d{2})/);
    const speed = line.match(/speed=\s*([\d.]+x)/);
    if (!time && !speed) return null;
    return {
      percent: undefined,
      size: time ? time[1] : '',
      speed: speed ? speed[1] : '',
      eta: '',
    };
  },
};
