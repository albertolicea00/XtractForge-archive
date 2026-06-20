import { describe, it, expect } from 'vitest';

import ytdlp from '../src/plugins/ytdlp';
import galleryDl from '../src/plugins/gallery-dl';
import spotdl from '../src/plugins/spotdl';
import lux from '../src/plugins/lux';
import curl from '../src/plugins/curl';
import ffmpeg from '../src/plugins/ffmpeg';

const ALL = [ytdlp, galleryDl, spotdl, lux, curl, ffmpeg];

describe('plugin interface', () => {
  it('every plugin has the required identity fields', () => {
    for (const p of ALL) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(p.type).toBe('downloader');
      expect(typeof p.canHandle).toBe('function');
      expect(typeof p.buildDownloadArgs).toBe('function');
    }
  });

  it('configSchema keys are unique per plugin', () => {
    for (const p of ALL) {
      const keys = (p.configSchema || []).map(f => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('canHandle routing', () => {
  it('yt-dlp is the catch-all', () => {
    expect(ytdlp.canHandle('https://anything.example/x')).toBe(true);
  });
  it('lux matches its sites', () => {
    expect(lux.canHandle('https://www.bilibili.com/video/BV1')).toBe(true);
    expect(lux.canHandle('https://example.com')).toBe(false);
  });
  it('gallery-dl matches gallery sites', () => {
    expect(galleryDl.canHandle('https://www.deviantart.com/x')).toBe(true);
  });
  it('spotdl matches spotify', () => {
    expect(spotdl.canHandle('https://open.spotify.com/track/abc')).toBe(true);
    expect(spotdl.canHandle('https://youtube.com')).toBe(false);
  });
  it('curl matches direct files but not streams', () => {
    expect(curl.canHandle('https://x.com/a/b.mp4')).toBe(true);
    expect(curl.canHandle('https://x.com/s.m3u8')).toBe(false);
  });
  it('ffmpeg matches streams and local media files', () => {
    expect(ffmpeg.canHandle('https://x.com/s.m3u8')).toBe(true);
    expect(ffmpeg.canHandle('rtmp://host/app/stream')).toBe(true);
    expect(ffmpeg.canHandle('https://x.com/a.mp4')).toBe(false);
    expect(ffmpeg.canHandle('/Users/test/video.mp4')).toBe(true);
    expect(ffmpeg.canHandle('C:\\path\\audio.mp3')).toBe(true);
    expect(ffmpeg.canHandle('/Users/test/text.txt')).toBe(false);
  });
});

describe('parseProgress', () => {
  it('yt-dlp parses its progress line', () => {
    const r = ytdlp.parseProgress('[download]  42.5% of ~10.00MiB at 1.20MiB/s ETA 00:08');
    expect(r).toMatchObject({ percent: 42.5, speed: '1.20MiB/s', eta: '00:08' });
  });
  it('returns null on unrelated lines', () => {
    expect(ytdlp.parseProgress('hello')).toBeNull();
    expect(ffmpeg.parseProgress('hello')).toBeNull();
  });
  it('ffmpeg surfaces time/speed', () => {
    const r = ffmpeg.parseProgress('frame= 10 time=00:00:05 speed= 2.0x');
    expect(r.size).toBe('00:00:05');
    expect(r.speed).toBe('2.0x');
  });
});

describe('buildDownloadArgs', () => {
  it('yt-dlp includes the url and an -o template', () => {
    const { binary, args } = ytdlp.buildDownloadArgs('https://y/x', { downloadFolder: '/tmp' }, {});
    expect(binary).toBe('yt-dlp');
    expect(args).toContain('https://y/x');
    expect(args).toContain('-o');
  });
  it('curl writes to the resolved filename', () => {
    const { binary, args } = curl.buildDownloadArgs('https://x.com/a/video.mp4', { downloadFolder: '/tmp' }, {});
    expect(binary).toBe('curl');
    expect(args.join(' ')).toContain('/tmp/video.mp4');
  });
  it('ffmpeg honors the container from pluginOptions', () => {
    const { args } = ffmpeg.buildDownloadArgs('https://x/s.m3u8', { downloadFolder: '/tmp', pluginOptions: { container: 'mkv' } }, {});
    expect(args.some(a => a.endsWith('.mkv'))).toBe(true);
    expect(args).toContain('copy');
  });

  it('ffmpeg handles local file conversion arguments', () => {
    const { binary, args } = ffmpeg.buildDownloadArgs('/Users/test/video.mp4', {
      downloadFolder: '/tmp',
      pluginOptions: {
        action: 'convert',
        container: 'mkv',
        videoCodec: 'h264',
        audioCodec: 'aac'
      }
    }, {});
    expect(binary).toBe('ffmpeg');
    expect(args).toContain('-i');
    expect(args).toContain('/Users/test/video.mp4');
    expect(args).toContain('-vcodec');
    expect(args).toContain('libx264');
    expect(args).toContain('-acodec');
    expect(args).toContain('aac');
    expect(args.some(a => a.endsWith('video_converted.mkv'))).toBe(true);
  });

  it('ffmpeg handles local file audio extraction arguments', () => {
    const { args } = ffmpeg.buildDownloadArgs('/Users/test/video.mp4', {
      downloadFolder: '/tmp',
      pluginOptions: {
        action: 'extract_audio',
        container: 'mp3',
        audioCodec: 'mp3'
      }
    }, {});
    expect(args).toContain('-vn');
    expect(args).toContain('libmp3lame');
    expect(args.some(a => a.endsWith('video_converted.mp3'))).toBe(true);
  });

  it('curl uses a custom filename from pluginOptions and resumes with -C -', () => {
    const { args } = curl.buildDownloadArgs('https://x.com/a/video.mp4', { downloadFolder: '/tmp', resume: true, pluginOptions: { filename: 'clip.mp4' } }, {});
    expect(args.join(' ')).toContain('/tmp/clip.mp4');
    expect(args.join(' ')).toContain('-C -');
  });

  it('yt-dlp nests playlists into a playlist folder template', () => {
    const flat = ytdlp.buildDownloadArgs('https://y/x', { downloadFolder: '/tmp' }, {});
    expect(flat.args.join(' ')).toContain('%(title)s.%(ext)s');
    expect(flat.args.join(' ')).not.toContain('playlist_title');
    const pl = ytdlp.buildDownloadArgs('https://y/list', { downloadFolder: '/tmp', isPlaylist: true }, {});
    expect(pl.args.join(' ')).toContain('%(playlist_title)s');
  });
});

describe('plugin getInfo metadata', () => {
    it('curl exposes a filename download option', () => {
      return curl.getInfo('https://x.com/a/video.mp4', {}).then(r => {
        expect(r.data._downloadOptions[0].key).toBe('filename');
        expect(r.data._downloadOptions[0].default).toBe('video.mp4');
      });
    });

    it('ffmpeg exposes conversion options for local files', () => {
      return ffmpeg.getInfo('/Users/test/movie.mp4', {}).then(r => {
        expect(r.data._downloadOptions.some(o => o.key === 'action')).toBe(true);
        expect(r.data._downloadOptions.some(o => o.key === 'container')).toBe(true);
        expect(r.data._downloadOptions.some(o => o.key === 'videoCodec')).toBe(true);
        expect(r.data.uploader).toBe('Local File');
        expect(r.data.title).toBe('movie');
      });
    });
  });
