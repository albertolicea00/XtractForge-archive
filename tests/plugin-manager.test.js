import { describe, it, expect } from 'vitest';
import { pluginManager as pm } from '../src/lib/plugin-loader';

describe('getDownloaderForUrl', () => {
  it('routes to the specific plugin per URL', () => {
    expect(pm.getDownloaderForUrl('https://www.bilibili.com/video/BV1').id).toBe('lux');
    expect(pm.getDownloaderForUrl('https://open.spotify.com/track/x').id).toBe('spotdl');
    expect(pm.getDownloaderForUrl('https://www.deviantart.com/x').id).toBe('gallery-dl');
    expect(pm.getDownloaderForUrl('https://host/stream.m3u8').id).toBe('ffmpeg');
    expect(pm.getDownloaderForUrl('https://host/file.mp4').id).toBe('curl');
  });

  it('falls back to yt-dlp for unknown URLs', () => {
    expect(pm.getDownloaderForUrl('https://unknown.example/watch?v=1').id).toBe('yt-dlp');
  });

  it('skips disabled plugins', () => {
    // Disable lux → a bilibili URL should fall through to yt-dlp (still handles it)
    const p = pm.getDownloaderForUrl('https://www.bilibili.com/video/BV1', ['lux']);
    expect(p.id).not.toBe('lux');
  });
});

describe('getPlugin / getAllPlugins', () => {
  it('looks up by id', () => {
    expect(pm.getPlugin('yt-dlp').id).toBe('yt-dlp');
    expect(pm.getPlugin('nope')).toBeNull();
  });
  it('lists downloaders', () => {
    const { downloaders } = pm.getAllPlugins();
    const ids = downloaders.map(p => p.id);
    expect(ids).toEqual(expect.arrayContaining(['yt-dlp', 'curl', 'ffmpeg', 'lux', 'spotdl', 'gallery-dl']));
  });
});

describe('getPluginConfig', () => {
  it('merges plugin overrides over global config', () => {
    const merged = pm.getPluginConfig('lux', { downloadFolder: '/d', plugins: { lux: { luxPath: '/bin/lux' } } });
    expect(merged.downloadFolder).toBe('/d');
    expect(merged.luxPath).toBe('/bin/lux');
  });
});
