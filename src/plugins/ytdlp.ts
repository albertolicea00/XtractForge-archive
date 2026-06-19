const path = {
  join: (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/')
};

const progressRegex = /\[download\]\s+([\d.]+)% of\s+(?:~\s*)?([\d.]+\w+) at\s+([\d.]+\w+\/s) ETA\s+([\d:]+)/;

export default {
  id: 'yt-dlp',
  name: 'yt-dlp',
  order: 3,
  tag: 'Core engine',
  description: 'Download from YouTube, Vimeo, Twitter/X, TikTok, and 1000+ sites',
  type: 'downloader',
  icon: '🎥',
  repoUrl: 'https://github.com/yt-dlp/yt-dlp',
  installHint: 'pip install yt-dlp  OR  brew install yt-dlp',
  install: {
    darwin: 'brew install yt-dlp ffmpeg',
    win32: 'winget install yt-dlp.yt-dlp',
    linux: 'pipx install yt-dlp',
    default: 'pip install yt-dlp',
  },
  locales: {
    es: {
      tag: 'Motor principal',
      description: 'Descarga de YouTube, Vimeo, Twitter/X, TikTok y más de 1000 sitios',
      fields: {
        ytdlpPath: { label: 'Ruta del binario yt-dlp', help: "Ruta al ejecutable de yt-dlp. Déjalo como 'yt-dlp' si está en el PATH." },
        ffmpegPath: { label: 'Ruta del binario ffmpeg', help: 'Ruta a ffmpeg, usado para unir video+audio y convertir formatos.' },
        embedSubtitles: { label: 'Incrustar subtítulos', help: 'Descarga los subtítulos disponibles y los incrusta en el video.' },
        sponsorBlock: { label: 'SponsorBlock', help: 'Omite segmentos de patrocinio/intro/outro en YouTube usando SponsorBlock.' },
        speedLimit: { label: 'Límite de velocidad', help: 'Limita la velocidad, ej. 50K o 10M. Vacío = sin límite.' },
      },
    },
  },

  configSchema: [
    { key: 'ytdlpPath', label: 'yt-dlp binary path', type: 'text', default: 'yt-dlp', placeholder: '/usr/local/bin/ytdlp', help: "Path to the yt-dlp executable. Leave as 'yt-dlp' if it's on your PATH." },
    { key: 'ffmpegPath', label: 'ffmpeg binary path', type: 'text', default: 'ffmpeg', placeholder: '/usr/local/bin/ffmpeg', help: 'Path to ffmpeg, used to merge separate video+audio streams and convert formats.' },
    { key: 'embedSubtitles', label: 'Embed Subtitles', type: 'toggle', default: false, help: 'Download available subtitles and embed them into the video file.' },
    { key: 'sponsorBlock', label: 'SponsorBlock', type: 'toggle', default: false, help: 'Skip sponsor/intro/outro segments on YouTube using the SponsorBlock database.' },
    { key: 'speedLimit', label: 'Speed Limit', type: 'text', default: '', placeholder: '50K, 10M (empty = unlimited)', help: 'Cap download speed, e.g. 50K or 10M. Leave empty for unlimited.' },
  ],

  async checkDependency(config: any) {
    const bin = config.ytdlpPath || 'yt-dlp';
    try {
      const res = await window.api.execCommand(bin, ['--version']);
      return { available: res.success, version: res.stdout.trim() };
    } catch {
      return { available: false, version: '' };
    }
  },

  canHandle() {
    return true;
  },

  async getInfo(url: string, config: any) {
    const bin = config.ytdlpPath || 'yt-dlp';
    const args = ['--dump-single-json', '--flat-playlist', url];
    try {
      const res = await window.api.execCommand(bin, args);
      if (res.success) {
        const data = JSON.parse(res.stdout);
        const isPlaylist = data._type === 'playlist' || Array.isArray(data.entries);
        const entryCount = Array.isArray(data.entries) ? data.entries.length : 0;
        return { success: true, data: { ...data, _plugin: 'yt-dlp', _isPlaylist: isPlaylist, _entryCount: entryCount } };
      } else {
        throw new Error(res.stderr || `yt-dlp exited with error`);
      }
    } catch (e: any) {
      throw new Error(`Failed to run yt-dlp: ${e.message}`);
    }
  },

  buildDownloadArgs(url: string, options: any, config: any) {
    const bin = config.ytdlpPath || 'yt-dlp';
    const args = [];

    const template = options.isPlaylist
      ? '%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s'
      : '%(title)s.%(ext)s';
    args.push('-o', path.join(options.downloadFolder || '.', template));

    if (options.speedLimit || config.speedLimit) {
      args.push('-r', options.speedLimit || config.speedLimit);
    }

    if (options.format) {
      args.push('-f', options.format);
    } else if (options.audioOnly) {
      args.push('-x', '--audio-format', options.audioFormat || 'mp3');
    } else {
      args.push('-f', 'bestvideo+bestaudio/best');
    }

    if (options.embedSubtitles || config.embedSubtitles) {
      args.push('--embed-subs', '--all-subs');
    }

    if (options.sponsorBlock || config.sponsorBlock) {
      args.push('--sponsorblock-remove', 'all');
    }

    args.push(url);
    return { binary: bin, args };
  },

  parseProgress(line: string) {
    const match = progressRegex.exec(line);
    if (!match) return null;
    return {
      percent: parseFloat(match[1]),
      size: match[2],
      speed: match[3],
      eta: match[4],
    };
  },
};
