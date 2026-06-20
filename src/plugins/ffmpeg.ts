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
    if (STREAM.test(url)) return true;
    const isLocal = url.startsWith('/') || /^[a-zA-Z]:\\/.test(url);
    if (isLocal) {
      const ext = url.split('.').pop()?.toLowerCase();
      const mediaExts = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'ts', 'm4v', 'mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus'];
      return !!(ext && mediaExts.includes(ext));
    }
    return false;
  },

  getInfo(url: string, config: any) {
    const isLocal = url.startsWith('/') || /^[a-zA-Z]:\\/.test(url);
    if (isLocal) {
      const parts = url.split(/[/\\]/);
      const filename = parts.pop() || 'media';
      const lastDot = filename.lastIndexOf('.');
      const baseName = lastDot === -1 ? filename : filename.substring(0, lastDot);
      const ext = lastDot === -1 ? 'mp4' : filename.substring(lastDot + 1).toLowerCase();

      return Promise.resolve({
        success: true,
        data: {
          title: baseName,
          thumbnail: '',
          thumbnails: [],
          duration: 0,
          uploader: 'Local File',
          channel: '',
          view_count: null,
          formats: [],
          _plugin: 'ffmpeg',
          _downloadOptions: [
            {
              key: 'action',
              label: 'Action',
              type: 'select',
              default: 'convert',
              options: ['convert', 'extract_audio'],
              help: 'Convert the video to another format, or extract its audio.'
            },
            {
              key: 'container',
              label: 'Output format',
              type: 'select',
              default: ext === 'mp3' || ext === 'm4a' || ext === 'wav' ? ext : 'mp4',
              options: ['mp4', 'mkv', 'mp3', 'm4a', 'wav'],
              help: 'The file container/format to convert to.'
            },
            {
              key: 'videoCodec',
              label: 'Video Codec',
              type: 'select',
              default: 'copy',
              options: ['copy', 'h264', 'h265'],
              help: 'Codec to use. "copy" is extremely fast as it does not re-encode.'
            },
            {
              key: 'audioCodec',
              label: 'Audio Codec',
              type: 'select',
              default: 'copy',
              options: ['copy', 'aac', 'mp3'],
              help: 'Codec to use for audio track.'
            }
          ]
        }
      });
    }

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
    const isLocal = url.startsWith('/') || /^[a-zA-Z]:\\/.test(url);

    if (isLocal) {
      const action = (options.pluginOptions && options.pluginOptions.action) || 'convert';
      const container = (options.pluginOptions && options.pluginOptions.container) || 'mp4';
      const videoCodec = (options.pluginOptions && options.pluginOptions.videoCodec) || 'copy';
      const audioCodec = (options.pluginOptions && options.pluginOptions.audioCodec) || 'copy';

      const parts = url.split(/[/\\]/);
      const filename = parts.pop() || 'media';
      const lastDot = filename.lastIndexOf('.');
      const baseName = lastDot === -1 ? filename : filename.substring(0, lastDot);

      const outName = `${baseName}_converted.${container}`;
      const out = path.join(options.downloadFolder || '.', outName);

      const args = ['-y', '-stats', '-i', url];

      if (action === 'extract_audio') {
        args.push('-vn');
        if (audioCodec === 'copy') {
          args.push('-acodec', 'copy');
        } else if (audioCodec === 'aac') {
          args.push('-acodec', 'aac');
        } else if (audioCodec === 'mp3') {
          args.push('-acodec', 'libmp3lame');
        }
      } else {
        if (videoCodec === 'copy') {
          args.push('-vcodec', 'copy');
        } else if (videoCodec === 'h264') {
          args.push('-vcodec', 'libx264');
        } else if (videoCodec === 'h265') {
          args.push('-vcodec', 'libx265');
        }

        if (audioCodec === 'copy') {
          args.push('-acodec', 'copy');
        } else if (audioCodec === 'aac') {
          args.push('-acodec', 'aac');
        } else if (audioCodec === 'mp3') {
          args.push('-acodec', 'libmp3lame');
        }
      }

      args.push(out);
      return { binary: bin, args };
    }

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
