const { spawn, execSync } = require('child_process');
const path = require('path');

// HLS / DASH manifests and live stream protocols ffmpeg can record.
const STREAM = /\.(m3u8|mpd)(\?|#|$)|^rtmps?:\/\/|^rtsp:\/\//i;

function nameFromUrl(url) {
  try {
    const u = new URL(url);
    const base = (u.pathname.split('/').filter(Boolean).pop() || 'stream').replace(/\.(m3u8|mpd)$/i, '');
    return base || 'stream';
  } catch {
    return 'stream';
  }
}

module.exports = {
  id: 'ffmpeg',
  name: 'FFmpeg',
  order: 5,
  tag: 'Streams',
  description: 'Record HLS (m3u8), DASH (mpd), and RTMP/RTSP live streams to a file',
  type: 'downloader',
  icon: '🎞️',
  repoUrl: 'https://ffmpeg.org',
  installHint: 'brew install ffmpeg  OR  see https://ffmpeg.org/download.html',
  install: {
    darwin: 'brew install ffmpeg',
    win32: 'winget install Gyan.FFmpeg',
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

  checkDependency(config) {
    const bin = config.ffmpegPath || 'ffmpeg';
    try {
      const out = execSync(`"${bin}" -version`, { encoding: 'utf8', timeout: 3000 });
      const m = out.match(/ffmpeg version (\S+)/i);
      return { available: true, version: m ? m[1] : out.split('\n')[0] };
    } catch {
      return { available: false, version: '' };
    }
  },

  configSchema: [
    { key: 'ffmpegPath', label: 'ffmpeg binary path', type: 'text', default: 'ffmpeg', placeholder: '/usr/local/bin/ffmpeg', help: "Path to the ffmpeg executable. Leave as 'ffmpeg' if it's on your PATH." },
    { key: 'ffmpegContainer', label: 'Output container', type: 'select', default: 'mp4', options: ['mp4', 'mkv', 'ts'], help: 'File format for the recorded stream. mp4 is the most compatible.' },
  ],

  canHandle(url) {
    return STREAM.test(url);
  },

  getInfo(url, config) {
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
        _simpleDownload: true,
      },
    });
  },

  buildDownloadArgs(url, options, config) {
    const bin = config.ffmpegPath || 'ffmpeg';
    const container = config.ffmpegContainer || 'mp4';
    const out = path.join(options.downloadFolder || '.', `${nameFromUrl(url)}.${container}`);
    // -stats prints progress to stderr; -c copy avoids re-encoding when possible
    const args = ['-y', '-stats', '-i', url, '-c', 'copy'];
    if (container === 'mp4') args.push('-bsf:a', 'aac_adtstoasc');
    args.push(out);
    return { binary: bin, args };
  },

  parseProgress(line) {
    // ffmpeg has no total for live streams; surface elapsed time + speed instead.
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
