const { spawn, execSync } = require('child_process');
const path = require('path');

module.exports = {
  id: 'spotdl',
  name: 'spotDL',
  description: 'Download Spotify tracks, albums, and playlists as high-quality audio',
  type: 'downloader',
  icon: '🎵',
  repoUrl: 'https://github.com/spotDL/spotify-downloader',
  installHint: 'pip install spotdl',

  configSchema: [
    { key: 'spotdlPath', label: 'spotdl binary path', type: 'text', default: 'spotdl', placeholder: '/usr/local/bin/spotdl' },
    { key: 'spotdlFormat', label: 'Output format', type: 'select', default: 'mp3', options: ['mp3', 'flac', 'ogg', 'opus', 'm4a', 'wav'] },
    { key: 'spotdlBitrate', label: 'Bitrate', type: 'select', default: '320k', options: ['128k', '192k', '256k', '320k'] },
  ],

  checkDependency(config) {
    const bin = config.spotdlPath || 'spotdl';
    try {
      const out = execSync(`"${bin}" --version 2>&1`, { encoding: 'utf8', timeout: 5000 });
      return { available: true, version: out.trim().split('\n')[0] };
    } catch {
      return { available: false, version: '' };
    }
  },

  canHandle(url) {
    return url.includes('open.spotify.com') || url.startsWith('spotify:');
  },

  getInfo(url, config) {
    const isPlaylist = url.includes('/playlist/');
    const isAlbum = url.includes('/album/');
    const isArtist = url.includes('/artist/');
    const fmt = config.spotdlFormat || 'mp3';
    const bitrate = config.spotdlBitrate || '320k';

    let contentType = 'Track';
    if (isPlaylist) contentType = 'Playlist';
    if (isAlbum) contentType = 'Album';
    if (isArtist) contentType = 'Artist discography';

    return Promise.resolve({
      success: true,
      data: {
        title: `Spotify ${contentType}`,
        thumbnail: '',
        thumbnails: [],
        duration: 0,
        uploader: 'Spotify',
        channel: 'Spotify',
        view_count: null,
        formats: [
          {
            format_id: fmt,
            ext: fmt,
            resolution: bitrate,
            filesize: null,
            format_note: `${fmt.toUpperCase()} @ ${bitrate} — downloaded via YouTube Music match`,
            vcodec: 'none',
          },
        ],
        _plugin: 'spotdl',
        _spotifyType: contentType.toLowerCase(),
      },
    });
  },

  buildDownloadArgs(url, options, config) {
    const bin = config.spotdlPath || 'spotdl';
    const fmt = config.spotdlFormat || 'mp3';
    const bitrate = config.spotdlBitrate || '320k';
    const outFolder = options.downloadFolder || '.';

    const args = [
      'download', url,
      '--output', path.join(outFolder, '{artist} - {title}.{output-ext}'),
      '--format', fmt,
      '--bitrate', bitrate,
    ];

    return { binary: bin, args };
  },

  parseProgress(line) {
    if (line.includes('Downloaded') || line.includes('Skipping')) {
      return { percent: 100, size: '', speed: '', eta: '' };
    }
    if (line.includes('Downloading')) {
      return { percent: 50, size: '', speed: '', eta: '' };
    }
    return null;
  },
};
