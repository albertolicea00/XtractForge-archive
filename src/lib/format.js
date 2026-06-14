// Pure formatting helpers — no React, no DOM.

export function getThumbnailUrl(info) {
  if (!info) return '';
  if (info.thumbnail) return info.thumbnail;
  if (info.thumbnails && info.thumbnails.length > 0) {
    return info.thumbnails[info.thumbnails.length - 1].url;
  }
  return '';
}

export function formatDuration(seconds) {
  if (!seconds) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatBytes(bytes, decimals = 2) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + sizes[i];
}

// Parse a human speed string (e.g. "1.23MiB/s", "950 KB/s") into bytes/second.
export function parseSpeedToBps(str) {
  if (typeof str !== 'string') return 0;
  const m = str.match(/([\d.]+)\s*([KMGT]?)(i?)B\/s/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return 0;
  const base = m[3] ? 1024 : 1000;
  const exp = { '': 0, K: 1, M: 2, G: 3, T: 4 }[m[2].toUpperCase()] ?? 0;
  return n * Math.pow(base, exp);
}
