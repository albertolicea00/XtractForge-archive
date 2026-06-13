const { spawn, execSync } = require('child_process');
const path = require('path');

const progressRegex = /\[download\]\s+([\d.]+)% of\s+(?:~\s*)?([\d.]+\w+) at\s+([\d.]+\w+\/s) ETA\s+([\d:]+)/;

module.exports = {
  id: 'yt-dlp',
  name: 'yt-dlp',
  order: 1,   // display order in the Plugins tab (routing order is separate)
  description: 'Download from YouTube, Vimeo, Twitter/X, TikTok, and 1000+ sites',
  type: 'downloader',
  icon: '▶',
  repoUrl: 'https://github.com/yt-dlp/yt-dlp',
  installHint: 'pip install yt-dlp  OR  brew install yt-dlp',
  // Per-OS install command. The renderer picks install[process.platform] and
  // falls back to install.default, then installHint.
  install: {
    darwin: 'brew install yt-dlp ffmpeg',
    win32: 'winget install yt-dlp.yt-dlp',
    linux: 'pipx install yt-dlp',
    default: 'pip install yt-dlp',
  },

  configSchema: [
    { key: 'ytdlpPath', label: 'yt-dlp binary path', type: 'text', default: 'yt-dlp', placeholder: '/usr/local/bin/yt-dlp' },
    { key: 'ffmpegPath', label: 'ffmpeg binary path', type: 'text', default: 'ffmpeg', placeholder: '/usr/local/bin/ffmpeg' },
    { key: 'embedSubtitles', label: 'Embed Subtitles', type: 'toggle', default: false },
    { key: 'sponsorBlock', label: 'SponsorBlock', type: 'toggle', default: false },
    { key: 'speedLimit', label: 'Speed Limit', type: 'text', default: '', placeholder: '50K, 10M (empty = unlimited)' },
  ],

  checkDependency(config) {
    const bin = config.ytdlpPath || 'yt-dlp';
    try {
      const out = execSync(`"${bin}" --version`, { encoding: 'utf8', timeout: 3000 });
      return { available: true, version: out.trim() };
    } catch {
      return { available: false, version: '' };
    }
  },

  // yt-dlp is the catch-all fallback — always returns true
  canHandle() {
    return true;
  },

  getInfo(url, config) {
    return new Promise((resolve, reject) => {
      const bin = config.ytdlpPath || 'yt-dlp';
      const args = ['--dump-single-json', '--flat-playlist', url];
      let stdout = '';
      let stderr = '';
      const proc = spawn(bin, args);
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', code => {
        if (code === 0) {
          try {
            const data = JSON.parse(stdout);
            resolve({ success: true, data: { ...data, _plugin: 'yt-dlp' } });
          } catch (e) {
            reject(new Error('Failed to parse yt-dlp output: ' + e.message));
          }
        } else {
          reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        }
      });
      proc.on('error', err => reject(new Error(`Failed to run yt-dlp: ${err.message}`)));
    });
  },

  buildDownloadArgs(url, options, config) {
    const bin = config.ytdlpPath || 'yt-dlp';
    const args = [];

    args.push('-o', path.join(options.downloadFolder || '.', '%(title)s.%(ext)s'));

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

  parseProgress(line) {
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
