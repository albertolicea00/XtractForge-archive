import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, ListOrdered, Settings as SettingsIcon, Folder, Play,
  CheckCircle2, AlertTriangle, Trash2, Sliders, Search,
  Clock, User, FileVideo, Music, XCircle, ChevronRight,
  RefreshCw, HardDrive, Puzzle, Zap, ToggleLeft, ToggleRight,
  UploadCloud, FolderOpen, Palette, Check, Copy, ShieldAlert, Globe, HelpCircle, Pause,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function getThumbnailUrl(info) {
  if (!info) return '';
  if (info.thumbnail) return info.thumbnail;
  if (info.thumbnails && info.thumbnails.length > 0) {
    return info.thumbnails[info.thumbnails.length - 1].url;
  }
  return '';
}

function formatDuration(seconds) {
  if (!seconds) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + sizes[i];
}

// Parse a human speed string (e.g. "1.23MiB/s", "950 KB/s") into bytes/second.
function parseSpeedToBps(str) {
  if (typeof str !== 'string') return 0;
  const m = str.match(/([\d.]+)\s*([KMGT]?)(i?)B\/s/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return 0;
  const base = m[3] ? 1024 : 1000;
  const exp = { '': 0, K: 1, M: 2, G: 3, T: 4 }[m[2].toUpperCase()] ?? 0;
  return n * Math.pow(base, exp);
}

const QUEUE_STATUS = {
  downloading: { label: 'Extracting', color: 'var(--primary)' },
  queued: { label: 'Waiting for allocation', color: 'var(--text-secondary)' },
  paused: { label: 'Paused', color: 'var(--text-secondary)' },
  completed: { label: 'Completed', color: 'var(--text-success)' },
  error: { label: 'Failed', color: 'var(--text-error)' },
};

// ─── theme application ────────────────────────────────────────────────────────
// A theme is { variables: { '--x': value } } + optional raw `css`. We inject a
// <style id="xf-theme"> with a :root block. User settings (accent, glass, mono)
// are layered on top of the theme's own variables.

const MONO_STACK = "'SFMono-Regular', 'JetBrains Mono', 'Fira Code', Consolas, monospace";

function hexToRgba(hex, alpha) {
  if (typeof hex !== 'string') return null;
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Extract [r,g,b] from an rgb()/rgba()/#hex string, or null if unparseable.
function parseRgb(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  if (s.startsWith('#')) {
    const rgba = hexToRgba(s, 1);
    if (!rgba) return null;
    str = rgba;
  }
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map(n => parseFloat(n));
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
  return [parts[0], parts[1], parts[2]];
}

function buildThemeCss(theme, settings = {}) {
  const vars = { ...(theme.variables || {}) };

  // Glass intensity (0–100): higher = more translucent glass surfaces.
  const intensity = typeof settings.glassIntensity === 'number' ? settings.glassIntensity : 75;
  const alpha = Math.max(0.15, Math.min(1, 1 - (intensity / 100) * 0.6));
  for (const key of ['--bg-card', '--bg-panel']) {
    const rgb = parseRgb(vars[key]);
    if (rgb) vars[key] = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
  }

  // Accent override: recolor primary/accent + gradients from one hex.
  const accent = (settings.accentOverride || '').trim();
  if (accent && hexToRgba(accent, 1)) {
    vars['--primary'] = accent;
    vars['--accent'] = accent;
    vars['--primary-glow'] = hexToRgba(accent, 0.3);
    vars['--accent-glow'] = hexToRgba(accent, 0.3);
    vars['--border-focus'] = hexToRgba(accent, 0.5);
    vars['--gradient-primary'] = `linear-gradient(135deg, ${accent} 0%, ${accent} 100%)`;
    vars['--gradient-hover'] = `linear-gradient(135deg, ${accent} 0%, ${accent} 100%)`;
  }

  // Mono font toggle.
  if (settings.monoFont) vars['--font-sans'] = MONO_STACK;

  const body = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `:root {\n${body}\n}\n${theme.css || ''}`;
}

function applyTheme(theme, settings) {
  if (!theme) return;
  let el = document.getElementById('xf-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'xf-theme';
    document.head.appendChild(el);
  }
  const css = buildThemeCss(theme, settings);
  el.textContent = css;
  // Cache so the next launch can paint the chosen theme instantly (no flash)
  try { localStorage.setItem('xf-theme-css', css); } catch {}
}

const ACCENT_PRESETS = ['#adc6ff', '#ff8a80', '#34d399', '#c4b5fd', '#fbbf24'];

// Pick the OS-appropriate install command for a plugin, falling back to the
// generic installHint. plugin.install is an optional { darwin, win32, linux, default } map.
function resolveInstall(plugin, platform) {
  if (plugin.install && typeof plugin.install === 'object') {
    return plugin.install[platform] || plugin.install.default || plugin.installHint || '';
  }
  return plugin.installHint || '';
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('download');

  // Plugin registry: { [pluginId]: { available, version, name, description, type, icon, repoUrl, configSchema, isBuiltin } }
  const [pluginStatus, setPluginStatus] = useState({});
  const [disabledPlugins, setDisabledPlugins] = useState([]);
  const [checkingDeps, setCheckingDeps] = useState(true);

  // Downloader state
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [detectedPlugin, setDetectedPlugin] = useState(null);
  // Which engine to extract with: 'auto' (let XtractForge pick) or a plugin id
  const [chosenEngine, setChosenEngine] = useState('auto');

  // Format selection
  const [downloadType, setDownloadType] = useState('video');
  const [selectedResolution, setSelectedResolution] = useState('best');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('mp3');
  const [selectedCustomFormat, setSelectedCustomFormat] = useState('');

  // Download queue
  const [queue, setQueue] = useState([]);
  // Raw console output per download id: { [id]: string }
  const [logs, setLogs] = useState({});
  // Which queue items have their console output expanded
  const [expandedLogs, setExpandedLogs] = useState({});
  // Free disk space on the download volume (bytes), refreshed periodically
  const [diskFree, setDiskFree] = useState(null);

  // Global settings
  const [settings, setSettings] = useState({
    ytdlpPath: 'yt-dlp',
    ffmpegPath: 'ffmpeg',
    downloadFolder: '',
    speedLimit: '',
    embedSubtitles: false,
    sponsorBlock: false,
  });

  // Plugin-specific configs: { [pluginId]: { ...keys } }
  const [pluginConfigs, setPluginConfigs] = useState({});

  // Import plugin feedback
  const [importResult, setImportResult] = useState(null);
  // Tracks which plugin's install command was just copied (for "Copied!" feedback)
  const [copiedInstall, setCopiedInstall] = useState(null);
  // Which plugin's detail/settings page is open in the Plugins tab (null = card grid)
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  // Transient "Saved" confirmation key (e.g. `plugin:yt-dlp`), cleared after a moment
  const [savedFlash, setSavedFlash] = useState(null);
  // Scroll container for the main content area
  const mainRef = useRef(null);

  // Themes
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState('xtractforge-default');
  const [themeSettings, setThemeSettings] = useState({ accentOverride: '#34d399', glassIntensity: 75, monoFont: true });
  const [themeImportResult, setThemeImportResult] = useState(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  const refreshPlugins = useCallback(async () => {
    setCheckingDeps(true);
    try {
      const status = await window.api.checkDependencies();
      setPluginStatus(status);
      const configs = await window.api.getPluginConfigs();
      setPluginConfigs(configs);
      // Hydrate persisted global settings + disabled plugins from config.json
      const saved = await window.api.getSettings();
      if (saved) {
        setSettings(prev => ({
          ...prev,
          downloadFolder: saved.downloadFolder || prev.downloadFolder,
          speedLimit: saved.speedLimit || '',
          embedSubtitles: !!saved.embedSubtitles,
          sponsorBlock: !!saved.sponsorBlock,
        }));
        setDisabledPlugins(saved.disabledPlugins || []);
      }
    } catch (err) {
      console.error('Failed to check dependencies:', err);
    } finally {
      setCheckingDeps(false);
    }
  }, []);

  const loadThemes = useCallback(async () => {
    try {
      const list = await window.api.getThemes();
      setThemes(list);
      const active = await window.api.getActiveTheme();
      setActiveThemeId(active.activeTheme || 'cyber-glass');
      if (active.themeSettings) setThemeSettings(active.themeSettings);
    } catch (err) {
      console.error('Failed to load themes:', err);
    }
  }, []);

  useEffect(() => {
    refreshPlugins();
    loadThemes();

    const unsub1 = window.api.onDownloadProgress((data) => {
      setQueue(prev => prev.map(item =>
        item.id === data.downloadId
          ? { ...item, percent: data.percent, speed: data.speed, eta: data.eta, size: data.size, status: item.status === 'paused' ? 'paused' : 'downloading' }
          : item
      ));
    });

    const unsub2 = window.api.onDownloadComplete((data) => {
      setQueue(prev => prev.map(item =>
        item.id === data.downloadId ? { ...item, status: 'completed', percent: 100 } : item
      ));
    });

    const unsub3 = window.api.onDownloadError((data) => {
      setQueue(prev => prev.map(item =>
        item.id === data.downloadId ? { ...item, status: 'error', errorMsg: data.error } : item
      ));
    });

    const unsub4 = window.api.onDownloadLog((data) => {
      setLogs(prev => {
        const existing = prev[data.downloadId] || '';
        // Keep only the last ~8000 chars per download to bound memory
        const combined = (existing + data.chunk).slice(-8000);
        return { ...prev, [data.downloadId]: combined };
      });
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [refreshPlugins, loadThemes]);

  // Refresh free disk space when viewing the queue
  useEffect(() => {
    if (activeTab !== 'queue') return;
    let alive = true;
    const tick = () => window.api.getDiskFree().then(v => { if (alive) setDiskFree(v); }).catch(() => {});
    tick();
    const t = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [activeTab]);

  // Apply the active theme + user settings whenever any of them change
  useEffect(() => {
    const theme = themes.find(t => t.id === activeThemeId);
    if (theme) applyTheme(theme, themeSettings);
  }, [themes, activeThemeId, themeSettings]);

  // ── Download tab ──────────────────────────────────────────────────────────

  const handleAnalyze = async (e, overrideUrl) => {
    if (e) e.preventDefault();
    const target = (overrideUrl || url).trim();
    if (!target) return;
    if (overrideUrl) setUrl(overrideUrl);

    setAnalyzing(true);
    setAnalysisError(null);
    setVideoInfo(null);
    setDetectedPlugin(null);

    try {
      const response = await window.api.getVideoInfo(target, chosenEngine);
      if (response.success) {
        setVideoInfo(response.data);
        setDetectedPlugin(response.pluginId || 'yt-dlp');
        if (response.data.formats?.length > 0) {
          const vf = response.data.formats.filter(f => f.vcodec !== 'none' && f.resolution);
          if (vf.length > 0) setSelectedCustomFormat(vf[vf.length - 1].format_id);
        }
      }
    } catch (err) {
      setAnalysisError(err.message || 'Error fetching media information.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;

    const downloadId = Date.now().toString();
    const title = videoInfo.title || 'Download';
    const thumbnail = getThumbnailUrl(videoInfo);

    let formatArg = '';
    let isAudio = false;

    if (videoInfo._isGallery || videoInfo._plugin === 'gallery-dl') {
      formatArg = 'original';
    } else if (videoInfo._plugin === 'spotdl') {
      formatArg = '';
    } else if (downloadType === 'video') {
      formatArg = selectedResolution === 'best' ? 'bestvideo+bestaudio/best' : `bestvideo[height<=${selectedResolution}]+bestaudio/best`;
    } else if (downloadType === 'audio') {
      isAudio = true;
    } else if (downloadType === 'custom') {
      formatArg = selectedCustomFormat;
    }

    const downloadOptions = {
      pluginId: detectedPlugin || 'yt-dlp',
      format: isAudio ? null : formatArg,
      audioOnly: isAudio,
      audioFormat: selectedAudioFormat,
      downloadFolder: settings.downloadFolder,
      speedLimit: settings.speedLimit,
      embedSubtitles: settings.embedSubtitles,
      sponsorBlock: settings.sponsorBlock,
    };

    const newItem = {
      id: downloadId,
      title,
      thumbnail,
      url: url.trim(),
      pluginId: detectedPlugin || 'yt-dlp',
      percent: 0,
      speed: '0 B/s',
      eta: '--:--',
      size: 'Unknown',
      status: 'queued',
      errorMsg: '',
      folder: settings.downloadFolder,
      audioOnly: isAudio,
    };

    setQueue(prev => [newItem, ...prev]);
    setActiveTab('queue');

    try {
      await window.api.startDownload(downloadId, url.trim(), downloadOptions);
    } catch (err) {
      setQueue(prev => prev.map(item =>
        item.id === downloadId ? { ...item, status: 'error', errorMsg: err.message } : item
      ));
    }
  };

  const handleCancelDownload = async (id) => {
    await window.api.cancelDownload(id);
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'error', errorMsg: 'Cancelled by user' } : item
    ));
  };

  const handlePauseDownload = async (id) => {
    const ok = await window.api.pauseDownload(id);
    if (ok) setQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'paused' } : item));
  };

  const handleResumeDownload = async (id) => {
    const ok = await window.api.resumeDownload(id);
    if (ok) setQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'downloading' } : item));
  };

  // Move a queue item up or down in the list (cosmetic ordering)
  const moveQueueItem = (id, dir) => {
    setQueue(prev => {
      const i = prev.findIndex(x => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const toggleLog = (id) => setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder();
    if (folder) { setSettings(prev => ({ ...prev, downloadFolder: folder })); flashSaved('global'); }
  };

  // ── Plugin management ─────────────────────────────────────────────────────

  const handleTogglePlugin = async (pluginId, currentlyEnabled) => {
    const newEnabled = !currentlyEnabled;
    await window.api.setPluginEnabled(pluginId, newEnabled);
    setDisabledPlugins(prev =>
      newEnabled ? prev.filter(id => id !== pluginId) : [...prev, pluginId]
    );
  };

  const handleImportPlugin = async () => {
    setImportResult(null);
    const result = await window.api.browsePluginFile();
    if (!result) return;
    setImportResult(result);
    if (result.success) await refreshPlugins();
  };

  const handleCopyInstall = async (id, cmd) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedInstall(id);
      setTimeout(() => setCopiedInstall(prev => (prev === id ? null : prev)), 1600);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  // Open a plugin's detail/settings page (and scroll the content back to top)
  const openPluginDetail = (id) => {
    setSelectedPlugin(id);
    if (mainRef.current) mainRef.current.scrollTo({ top: 0 });
  };

  // Briefly show a "Saved" confirmation for a given key
  const flashSaved = (key) => {
    setSavedFlash(key);
    setTimeout(() => setSavedFlash(prev => (prev === key ? null : prev)), 1600);
  };

  // Update one plugin config field and persist immediately (auto-save)
  const updatePluginConfig = (id, key, value) => {
    setPluginConfigs(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), [key]: value } };
      window.api.savePluginConfigs(next);
      return next;
    });
    flashSaved(`plugin:${id}`);
  };

  // Update a global setting and persist immediately (auto-save)
  const updateSetting = (patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      window.api.saveSettings(next);
      return next;
    });
    flashSaved('global');
  };

  // ── Theme management ──────────────────────────────────────────────────────

  const handleSetTheme = async (themeId) => {
    setActiveThemeId(themeId);
    await window.api.setActiveTheme(themeId);
  };

  const handleThemeSetting = async (patch) => {
    const next = { ...themeSettings, ...patch };
    setThemeSettings(next);
    await window.api.saveThemeSettings(next);
  };

  const handleImportTheme = async () => {
    setThemeImportResult(null);
    const result = await window.api.browseThemeFile();
    if (!result) return;
    setThemeImportResult(result);
    if (result.success) await loadThemes();
  };

  // ── Active plugins for sidebar ────────────────────────────────────────────

  const availableDownloaders = Object.entries(pluginStatus)
    .filter(([id, p]) => p.type === 'downloader' && p.available && !disabledPlugins.includes(id))
    .map(([id, p]) => ({ id, ...p }));

  const downloaderPlugins = Object.entries(pluginStatus)
    .filter(([, p]) => p.type === 'downloader')
    .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <div className="titlebar-drag"></div>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-name">XtractForge</span>
        </div>

        <ul className="nav-links">
          {[
            { id: 'download', icon: <Download />, label: 'Download' },
            { id: 'queue', icon: <ListOrdered />, label: `Queue (${queue.length})` },
            { id: 'plugins', icon: <Puzzle />, label: 'Plugins' },
            { id: 'themes', icon: <Palette />, label: 'Themes' },
            { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
          ].map(({ id, icon, label }) => (
            <li
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => { setActiveTab(id); if (id === 'plugins') setSelectedPlugin(null); }}
            >
              {icon}
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="dependency-status">
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active tools
            </p>
            {availableDownloaders.length === 0 && !checkingDeps && (
              <div className="status-badge">
                <span className="status-indicator error"></span>
                <span style={{ fontSize: '11px' }}>No plugins available</span>
              </div>
            )}
            {availableDownloaders.map(p => (
              <div key={p.id} className="status-badge">
                <span className="status-indicator success"></span>
                <span style={{ fontSize: '11px' }}> {p.name}</span>
                {/* <span style={{ fontSize: '11px' }}> {p.name} {p.version.replace(/[^0-9.]/g, "")}</span> */}
              </div>
            ))}
            <button
              className="btn btn-secondary"
              style={{ padding: '6px', fontSize: '11px', marginTop: '8px' }}
              onClick={refreshPlugins}
              disabled={checkingDeps}
            >
              <RefreshCw size={12} className={checkingDeps ? 'spinner' : ''} />
              Recheck
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content" ref={mainRef}>

        {/* ── TAB: Download ───────────────────────────────────────────────── */}
        {activeTab === 'download' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card" style={{ padding: '56px 32px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '46px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.05 }}>Extract Anything.</h1>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                Paste a URL to start media extraction — XtractForge auto-detects the right tool.
              </p>

              <form onSubmit={handleAnalyze} style={{ maxWidth: '680px', margin: '28px auto 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '8px 8px 8px 18px' }}>
                  <input
                    id="url-input"
                    type="text"
                    placeholder="https://vimeo.com/724103…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={analyzing}
                    style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '16px' }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={analyzing || !url.trim()} style={{ flexShrink: 0, fontSize: '15px', padding: '12px 28px' }}>
                    {analyzing ? <><RefreshCw className="spinner" size={16} /> Extracting…</> : <>Extract</>}
                  </button>
                </div>

                {/* Engine picker — default Auto lets XtractForge choose the best tool */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Engine</span>
                  <select
                    value={chosenEngine}
                    onChange={(e) => setChosenEngine(e.target.value)}
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="auto">Auto-detect (recommended)</option>
                    {downloaderPlugins.filter(([id]) => !disabledPlugins.includes(id)).map(([id, p]) => (
                      <option key={id} value={id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-success)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', padding: '6px 14px' }}>
                  ● Auto-detect enabled
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: availableDownloaders.length ? 'var(--text-secondary)' : 'var(--text-error)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', padding: '6px 14px' }}>
                  Plugins active: {availableDownloaders.length}
                </span>
                {detectedPlugin && pluginStatus[detectedPlugin] && (
                  <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', padding: '6px 14px' }}>
                    {pluginStatus[detectedPlugin].icon} via {pluginStatus[detectedPlugin].name}
                  </span>
                )}
              </div>

              {availableDownloaders.length === 0 && !checkingDeps && (
                <p style={{ fontSize: '12px', color: 'var(--text-error)', marginTop: '16px' }}>
                  No tools installed or enabled. Open the <strong>Plugins</strong> tab to install or enable one before extracting.
                </p>
              )}
            </div>

            {analysisError && (
              <div className="error-banner">
                <AlertTriangle size={20} />
                <div>
                  <strong>Analysis Error</strong>
                  <p style={{ marginTop: '4px', fontSize: '13px' }}>{analysisError}</p>
                </div>
              </div>
            )}

            {videoInfo && (
              <div className="glass-card" style={{ animation: 'fadeIn 0.3s ease' }}>
                <div className="analysis-container">
                  {/* Media preview */}
                  <div className="video-details-info">
                    {getThumbnailUrl(videoInfo) ? (
                      <div className="video-thumbnail-wrapper">
                        <img className="video-thumbnail" src={getThumbnailUrl(videoInfo)} alt={videoInfo.title} />
                        {videoInfo.duration > 0 && (
                          <div className="video-duration">{formatDuration(videoInfo.duration)}</div>
                        )}
                      </div>
                    ) : (
                      <div className="video-thumbnail-wrapper" style={{ background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}>
                        {videoInfo._isGallery ? <span style={{ fontSize: '48px' }}>🖼</span> : <Download size={48} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    )}
                    <div style={{ marginTop: '12px' }}>
                      <h3 className="video-title">{videoInfo.title}</h3>
                      {(videoInfo.uploader || videoInfo.channel) && (
                        <div className="video-channel">
                          <User size={14} />
                          <span>{videoInfo.uploader || videoInfo.channel}</span>
                        </div>
                      )}
                      {detectedPlugin && pluginStatus[detectedPlugin] && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {pluginStatus[detectedPlugin].icon} Handled by {pluginStatus[detectedPlugin].name}
                        </div>
                      )}
                    </div>
                    <div className="video-meta-grid">
                      {videoInfo.duration > 0 && (
                        <div className="meta-card">
                          <div className="meta-card-label">Duration</div>
                          <div className="meta-card-value">{formatDuration(videoInfo.duration)}</div>
                        </div>
                      )}
                      {videoInfo.view_count && (
                        <div className="meta-card">
                          <div className="meta-card-label">Views</div>
                          <div className="meta-card-value">{videoInfo.view_count.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Format selection */}
                  <div className="format-selection-container">
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Download Options</h3>

                    {/* gallery-dl: no format selection needed */}
                    {videoInfo._isGallery ? (
                      <div style={{ padding: '16px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        gallery-dl will download all images/files in this gallery at original quality.
                      </div>
                    ) : videoInfo._plugin === 'spotdl' ? (
                      <div style={{ padding: '16px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        spotDL will match and download all tracks via YouTube Music.
                        Configure format/bitrate in Settings → Plugins → spotDL.
                      </div>
                    ) : (
                      <>
                        <div className="tabs">
                          <button className={`tab ${downloadType === 'video' ? 'active' : ''}`} onClick={() => setDownloadType('video')}>
                            <FileVideo size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Video
                          </button>
                          <button className={`tab ${downloadType === 'audio' ? 'active' : ''}`} onClick={() => setDownloadType('audio')}>
                            <Music size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Audio Only
                          </button>
                          {videoInfo.formats && videoInfo.formats.length > 1 && (
                            <button className={`tab ${downloadType === 'custom' ? 'active' : ''}`} onClick={() => setDownloadType('custom')}>
                              <Sliders size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Formats
                            </button>
                          )}
                        </div>

                        {downloadType === 'video' && (
                          <div className="input-group">
                            <label>Video Quality</label>
                            <select
                              style={{ padding: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '14px' }}
                              value={selectedResolution}
                              onChange={(e) => setSelectedResolution(e.target.value)}
                            >
                              <option value="best">Best Available (4K / 1080p / 720p)</option>
                              <option value="1080">Full HD (1080p)</option>
                              <option value="720">HD (720p)</option>
                              <option value="480">Standard (480p)</option>
                              <option value="360">Low (360p)</option>
                            </select>
                          </div>
                        )}

                        {downloadType === 'audio' && (
                          <div className="input-group">
                            <label>Audio Format</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              {['mp3', 'm4a', 'wav'].map(fmt => (
                                <label key={fmt} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: selectedAudioFormat === fmt ? 'rgba(139,92,246,0.15)' : 'var(--bg-hover)', border: selectedAudioFormat === fmt ? '1px solid var(--primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500, textTransform: 'uppercase' }}>
                                  <input type="radio" name="audio-format" value={fmt} checked={selectedAudioFormat === fmt} onChange={() => setSelectedAudioFormat(fmt)} style={{ accentColor: 'var(--primary)' }} />
                                  {fmt}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {downloadType === 'custom' && videoInfo.formats && (
                          <div className="formats-table-wrapper">
                            <table className="formats-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}></th>
                                  <th>ID</th><th>Ext</th><th>Resolution</th><th>FPS</th><th>Est. Size</th><th>Info</th>
                                </tr>
                              </thead>
                              <tbody>
                                {videoInfo.formats.filter(f => f.resolution || f.vcodec !== 'none').map(format => (
                                  <tr key={format.format_id} onClick={() => setSelectedCustomFormat(format.format_id)} className={selectedCustomFormat === format.format_id ? 'selected' : ''}>
                                    <td><input type="radio" name="custom-format" value={format.format_id} checked={selectedCustomFormat === format.format_id} onChange={() => setSelectedCustomFormat(format.format_id)} /></td>
                                    <td style={{ fontWeight: 600 }}>{format.format_id}</td>
                                    <td>{format.ext}</td>
                                    <td>{format.resolution || 'audio only'}</td>
                                    <td>{format.fps || '-'}</td>
                                    <td>{format.filesize ? formatBytes(format.filesize) : format.filesize_approx ? `~${formatBytes(format.filesize_approx)}` : '-'}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{format.format_note || format.acodec || format.vcodec}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}

                    {/* Folder */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <Folder size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={settings.downloadFolder || 'Not selected'}>
                          Save to: <strong>{settings.downloadFolder || 'Not selected'}</strong>
                        </span>
                      </div>
                      <button onClick={handleSelectFolder} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}>Change</button>
                    </div>

                    {/* Download button */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button onClick={handleDownload} className="btn btn-primary" style={{ flex: 1, padding: '14px' }}>
                        <Download size={18} /> Download Now
                      </button>
                      <button onClick={() => window.api.openFolder(settings.downloadFolder)} className="btn btn-secondary" title="Open Destination Folder" style={{ padding: '14px' }}>
                        <Folder size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Queue ──────────────────────────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="glass-card">
            <div className="queue-header">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Download Queue</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Active downloads and history.</p>
              </div>
              {queue.some(i => i.status === 'completed') && (
                <button onClick={() => setQueue(prev => prev.filter(i => i.status !== 'completed'))} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                  <Trash2 size={14} /> Clear Completed
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="empty-state">
                <Download />
                <h3>No active downloads</h3>
                <p style={{ fontSize: '14px', marginTop: '4px' }}>Analyze a URL in the Download tab to start.</p>
              </div>
            ) : (
              <div className="queue-list">
                {queue.map((item, idx) => {
                  const st = QUEUE_STATUS[item.status] || QUEUE_STATUS.queued;
                  const log = logs[item.id];
                  const showExpand = !!log;
                  return (
                  <div key={item.id} className="queue-item" style={{ flexWrap: 'wrap' }}>
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '96px', height: '54px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Download size={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    <div className="queue-item-info">
                      <div className="queue-item-title" title={item.title}>{item.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: st.color }}>● {st.label}</span>
                        {item.pluginId && pluginStatus[item.pluginId] && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {pluginStatus[item.pluginId].icon} {pluginStatus[item.pluginId].name}
                          </span>
                        )}
                      </div>
                      {(item.status === 'downloading' || item.status === 'paused') && (
                        <>
                          <div className="queue-item-meta">
                            <span>{item.percent?.toFixed(1)}%</span>
                            {item.size && <span>Size: {item.size}</span>}
                            {item.status === 'downloading' && item.speed && <span>Speed: {item.speed}</span>}
                            {item.status === 'downloading' && item.eta && <span>ETA: {item.eta}</span>}
                          </div>
                          <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${item.percent || 0}%`, opacity: item.status === 'paused' ? 0.5 : 1 }}></div>
                          </div>
                        </>
                      )}
                      {item.status === 'error' && <div className="queue-item-meta" style={{ color: 'var(--text-error)', fontSize: '11px' }}>{item.errorMsg}</div>}
                      {showExpand && (
                        <button onClick={() => toggleLog(item.id)} style={{ alignSelf: 'flex-start', marginTop: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                          <ChevronRight size={12} style={{ transform: expandedLogs[item.id] ? 'rotate(90deg)' : 'none', transition: 'var(--transition-fast)' }} />
                          {expandedLogs[item.id] ? 'Hide output' : 'Show output'}
                        </button>
                      )}
                    </div>
                    <div className="queue-item-actions">
                      {(item.status === 'downloading' || item.status === 'paused') && (
                        <>
                          {item.status === 'downloading'
                            ? <button onClick={() => handlePauseDownload(item.id)} className="btn btn-secondary" style={{ padding: '8px' }} title="Pause"><Pause size={16} /></button>
                            : <button onClick={() => handleResumeDownload(item.id)} className="btn btn-secondary" style={{ padding: '8px' }} title="Resume"><Play size={16} /></button>}
                          <button onClick={() => handleCancelDownload(item.id)} className="btn btn-danger" style={{ padding: '8px' }} title="Cancel"><XCircle size={16} /></button>
                        </>
                      )}
                      {item.status === 'completed' && <><button onClick={() => window.api.openFolder(item.folder)} className="btn btn-secondary" style={{ padding: '8px' }} title="Open folder"><Folder size={16} /></button><button onClick={() => setQueue(prev => prev.filter(i => i.id !== item.id))} className="btn btn-secondary" style={{ padding: '8px' }} title="Remove"><Trash2 size={16} /></button></>}
                      {item.status === 'error' && <button onClick={() => setQueue(prev => prev.filter(i => i.id !== item.id))} className="btn btn-secondary" style={{ padding: '8px' }} title="Remove"><Trash2 size={16} /></button>}
                      {/* Reorder */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => moveQueueItem(item.id, -1)} disabled={idx === 0} className="btn btn-secondary" style={{ padding: '2px 6px', opacity: idx === 0 ? 0.4 : 1 }} title="Move up"><ChevronRight size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
                        <button onClick={() => moveQueueItem(item.id, 1)} disabled={idx === queue.length - 1} className="btn btn-secondary" style={{ padding: '2px 6px', opacity: idx === queue.length - 1 ? 0.4 : 1 }} title="Move down"><ChevronRight size={12} style={{ transform: 'rotate(90deg)' }} /></button>
                      </div>
                    </div>

                    {/* Expandable console output */}
                    {showExpand && expandedLogs[item.id] && (
                      <pre style={{ flexBasis: '100%', margin: '4px 0 0', maxHeight: '180px', overflow: 'auto', background: 'var(--bg-deep)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '11px', lineHeight: 1.5, color: 'var(--text-secondary)', fontFamily: "'SFMono-Regular', Consolas, monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {log}
                      </pre>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {/* Summary bar */}
            {queue.length > 0 && (() => {
              const extracting = queue.filter(i => i.status === 'downloading').length;
              const waiting = queue.filter(i => i.status === 'queued' || i.status === 'paused').length;
              const done = queue.filter(i => i.status === 'completed').length;
              const totalBps = queue.filter(i => i.status === 'downloading').reduce((sum, i) => sum + parseSpeedToBps(i.speed), 0);
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--primary)' }}>● {extracting} Extracting</span>
                    <span style={{ color: 'var(--text-muted)' }}>● {waiting} Waiting</span>
                    <span style={{ color: 'var(--text-success)' }}>● {done} Completed</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                    <span>Total speed: <strong style={{ color: 'var(--text-primary)' }}>{totalBps > 0 ? formatBytes(totalBps) + '/s' : '—'}</strong></span>
                    {diskFree != null && <span>Storage free: <strong style={{ color: 'var(--text-primary)' }}>{formatBytes(diskFree)}</strong></span>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── TAB: Plugins ────────────────────────────────────────────────── */}
        {activeTab === 'plugins' && !selectedPlugin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Puzzle size={22} style={{ color: 'var(--primary)' }} /> Plugins
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '520px', lineHeight: 1.5 }}>
                  Manage and configure your extraction engines. Enable what you need, or import community-built modules.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => window.api.openPluginsDir()} style={{ fontSize: '13px', padding: '8px 14px' }}>
                  <FolderOpen size={14} /> Plugins Folder
                </button>
                <button className="btn btn-primary" onClick={handleImportPlugin} style={{ fontSize: '13px', padding: '8px 14px' }}>
                  <UploadCloud size={14} /> Import from Community
                </button>
              </div>
            </div>

            {/* Security warning — external plugins run with full Node.js access in the main process */}
            <div className="error-banner" style={{ margin: 0, background: 'rgba(244, 63, 94, 0.1)', borderColor: 'var(--text-error)' }}>
              <ShieldAlert size={20} />
              <div>
                <strong>Only import plugins you trust</strong>
                <p style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  A plugin is executable code that runs with full access to your computer — files, network, and shell commands.
                  A malicious plugin from an unknown author can steal data or damage your system. Never import a <code>.js</code> file
                  from someone you don't trust, and read the source before installing.
                </p>
              </div>
            </div>

            {importResult && (
              <div className="error-banner" style={{ margin: 0, borderColor: importResult.success ? 'var(--text-success)' : undefined }}>
                {importResult.success ? <CheckCircle2 size={18} style={{ color: 'var(--text-success)' }} /> : <AlertTriangle size={18} />}
                <div>
                  <strong>{importResult.success ? `Plugin "${importResult.id}" imported` : 'Import failed'}</strong>
                  {!importResult.success && <p style={{ fontSize: '12px', marginTop: '2px' }}>{importResult.error}</p>}
                </div>
              </div>
            )}

            {/* Plugin cards — built-ins by `order`, imported ones in import order after */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {downloaderPlugins.map(([id, plugin]) => {
                const enabled = !disabledPlugins.includes(id);
                return (
                  <div key={id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', opacity: enabled ? 1 : 0.55, transition: 'var(--transition-fast)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                          {plugin.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '17px', fontWeight: 700 }}>{plugin.name}</div>
                          {(plugin.tag || plugin.isBuiltin) && (
                            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--primary)' }}>
                              {plugin.tag || (plugin.isBuiltin ? 'Built-in' : 'Community')}
                            </span>
                          )}
                        </div>
                      </div>
                      <label className="switch" style={{ flexShrink: 0 }} title={enabled ? 'Enabled' : 'Disabled'}>
                        <input type="checkbox" checked={enabled} onChange={() => handleTogglePlugin(id, enabled)} />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{plugin.description}</p>

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Version</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: plugin.available ? 'var(--text-primary)' : 'var(--text-error)' }}>
                          {plugin.available ? plugin.version.replace(/[^0-9.]/g, "") : 'Not installed'}
                        </div>
                      </div>
                      <button
                        onClick={() => openPluginDetail(id)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
                      >
                        Settings <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Building a plugin</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Plugins are single <code>.js</code> files. The full API reference and examples live on GitHub.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', flexShrink: 0 }} onClick={() => window.api.openExternal('https://github.com/albertolicea00/XtractForge/blob/main/ADDONS.md')}>
                <Globe size={14} /> Plugin docs
              </button>
            </div>
          </div>
        )}

        {/* ── Plugin detail / settings page ───────────────────────────────── */}
        {activeTab === 'plugins' && selectedPlugin && pluginStatus[selectedPlugin] && (() => {
          const id = selectedPlugin;
          const plugin = pluginStatus[id];
          const enabled = !disabledPlugins.includes(id);
          const cfg = pluginConfigs[id] || {};
          const installCmd = !plugin.available ? resolveInstall(plugin, window.api.platform) : '';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <button
                onClick={() => setSelectedPlugin(null)}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
              >
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> All plugins
              </button>

              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div style={{ width: '52px', height: '52px', flexShrink: 0, borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
                      {plugin.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{plugin.name}</h2>
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', borderRadius: '10px' }}>
                          {plugin.isBuiltin ? 'built-in' : (plugin.author || 'community')}
                        </span>
                        <span style={{ fontSize: '11px', color: plugin.available ? 'var(--text-success)' : 'var(--text-error)' }}>
                          {plugin.available ? `● v${plugin.version.replace(/[^0-9.]/g, "")}` : '○ not installed'}
                        </span>
                        {plugin.repoUrl && (
                          <button onClick={() => window.api.openExternal(plugin.repoUrl)} title={plugin.repoUrl} aria-label="Open project website" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center' }}>
                            <Globe size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>{plugin.description}</p>
                    </div>
                  </div>
                  <label className="switch" style={{ flexShrink: 0 }} title={enabled ? 'Enabled' : 'Disabled'}>
                    <input type="checkbox" checked={enabled} onChange={() => handleTogglePlugin(id, enabled)} />
                    <span className="slider"></span>
                  </label>
                </div>

                {/* Install command when the binary is missing */}
                {installCmd && (
                  <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--text-error)' }}>Not installed.</strong> Run this in your terminal to install it:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <code style={{ fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>{installCmd}</code>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleCopyInstall(id, installCmd)}>
                        {copiedInstall === id ? <><Check size={13} style={{ color: 'var(--text-success)' }} /> Copied</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration */}
              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sliders size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Configuration</h3>
                  {savedFlash === `plugin:${id}` && (
                    <span style={{ fontSize: '12px', color: 'var(--text-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={13} /> Saved
                    </span>
                  )}
                </div>

                {plugin.configSchema && plugin.configSchema.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {plugin.configSchema.map(field => (
                      <div key={field.key} className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {field.label}
                          {field.help && (
                            <span className="help-tip" data-tip={field.help}>
                              <HelpCircle size={13} />
                            </span>
                          )}
                        </label>
                        {field.type === 'toggle' ? (
                          <label className="switch">
                            <input type="checkbox" checked={!!(cfg[field.key] ?? field.default)} onChange={(e) => updatePluginConfig(id, field.key, e.target.checked)} />
                            <span className="slider"></span>
                          </label>
                        ) : field.type === 'select' ? (
                          <select value={cfg[field.key] ?? field.default} onChange={(e) => updatePluginConfig(id, field.key, e.target.value)} style={{ padding: '10px 12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder={field.placeholder || ''} value={cfg[field.key] ?? field.default ?? ''} onChange={(e) => updatePluginConfig(id, field.key, e.target.value)} style={{ padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none' }} />
                        )}
                      </div>
                    ))}
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Changes are saved automatically.</p>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>This plugin has no configurable options.</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── TAB: Themes ─────────────────────────────────────────────────── */}
        {activeTab === 'themes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={20} style={{ color: 'var(--primary)' }} /> Themes
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Personalize your workspace. Import community themes (.js files exporting CSS variables).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={() => window.api.openThemesDir()} style={{ fontSize: '13px', padding: '8px 14px' }}>
                    <FolderOpen size={14} /> Themes Folder
                  </button>
                  <button className="btn btn-primary" onClick={handleImportTheme} style={{ fontSize: '13px', padding: '8px 14px' }}>
                    <UploadCloud size={14} /> Import Theme
                  </button>
                </div>
              </div>

              {themeImportResult && (
                <div className="error-banner" style={{ marginTop: '16px', marginBottom: 0, borderColor: themeImportResult.success ? 'var(--text-success)' : undefined }}>
                  {themeImportResult.success ? <CheckCircle2 size={18} style={{ color: 'var(--text-success)' }} /> : <AlertTriangle size={18} />}
                  <div>
                    <strong>{themeImportResult.success ? `Theme "${themeImportResult.id}" imported` : 'Import failed'}</strong>
                    {!themeImportResult.success && <p style={{ fontSize: '12px', marginTop: '2px' }}>{themeImportResult.error}</p>}
                  </div>
                </div>
              )}

              {/* Visual Modes */}
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '24px 0 12px' }}>Visual Modes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: '12px' }}>
                {themes.map(theme => {
                  const active = theme.id === activeThemeId;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleSetTheme(theme.id)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                        boxShadow: active ? '0 0 0 1px var(--primary), var(--shadow-glow)' : 'none',
                        overflow: 'hidden',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      {/* Preview strip rendered from the theme's own colors */}
                      <div style={{
                        position: 'relative',
                        height: '64px',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '5px',
                        background: theme.variables['--bg-dark'] || theme.variables['--bg-deep'] || '#0f0f13',
                        backgroundImage: theme.variables['--gradient-dark'] || 'none',
                      }}>
                        {active && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={12} color="#fff" />
                          </div>
                        )}
                        {(theme.swatches || []).map((c, i) => (
                          <div key={i} style={{ width: '15px', height: '15px', borderRadius: '50%', background: c, border: '2px solid rgba(255,255,255,0.15)' }} />
                        ))}
                      </div>
                      <div style={{ padding: '8px 10px 10px', background: 'var(--bg-hover)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{theme.name}</span>
                          {theme.isBuiltin
                            ? <span style={{ fontSize: '9px', padding: '1px 5px', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', borderRadius: '10px' }}>built-in</span>
                            : <span style={{ fontSize: '9px', padding: '1px 5px', background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: '10px' }}>{theme.author || 'community'}</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>{theme.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customization row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Custom Accent Color</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Override the primary brand color across the entire interface.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                    <input
                      type="text"
                      value={themeSettings.accentOverride || ''}
                      placeholder="#8B5CF6"
                      onChange={(e) => handleThemeSetting({ accentOverride: e.target.value })}
                      style={{ width: '90px', background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '14px', outline: 'none' }}
                    />
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: themeSettings.accentOverride || 'var(--primary)', border: '1px solid var(--border-color)' }} />
                  </div>
                  {ACCENT_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => handleThemeSetting({ accentOverride: c })}
                      aria-label={`Accent ${c}`}
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%', background: c, cursor: 'pointer',
                        border: (themeSettings.accentOverride || '').toLowerCase() === c.toLowerCase() ? '2px solid var(--text-primary)' : '2px solid transparent',
                        boxShadow: (themeSettings.accentOverride || '').toLowerCase() === c.toLowerCase() ? `0 0 12px ${c}` : 'none',
                      }}
                    />
                  ))}
                  <button
                    onClick={() => handleThemeSetting({ accentOverride: '' })}
                    title="Reset to theme default"
                    style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>

              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Glass Intensity</h3>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>{themeSettings.glassIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={themeSettings.glassIntensity}
                  onChange={(e) => handleThemeSetting({ glassIntensity: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  <span>SOLID</span><span>FROSTED</span><span>TRANSLUCENT</span>
                </div>
              </div>

              <div className="toggle-row">
                <div className="toggle-details">
                  <span className="toggle-title">Mono Font</span>
                  <span className="toggle-desc">Technical metadata mode — render the whole UI in a monospace font.</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={!!themeSettings.monoFont} onChange={(e) => handleThemeSetting({ monoFont: e.target.checked })} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Building a theme</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Themes are single <code>.js</code> files mapping CSS variables. The full authoring guide lives on GitHub.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', flexShrink: 0 }} onClick={() => window.api.openExternal('https://github.com/albertolicea00/XtractForge/blob/main/ADDONS.md#themes')}>
                <Globe size={14} /> Theme docs
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: Settings ───────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Settings</h2>
                {savedFlash === 'global' && (
                  <span style={{ fontSize: '12px', color: 'var(--text-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> Saved
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '20px' }}>App-wide defaults. Changes are saved automatically.</p>

              <div className="settings-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System & Folders</h3>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Default Downloads Folder</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={settings.downloadFolder} readOnly style={{ flexGrow: 1, padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none' }} />
                      <button onClick={handleSelectFolder} className="btn btn-secondary" style={{ padding: '12px' }}><Folder size={16} /> Browse</button>
                    </div>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Download Speed Limit</label>
                    <input type="text" placeholder="50K, 10M (empty = unlimited)" value={settings.speedLimit} onChange={(e) => updateSetting({ speedLimit: e.target.value })} style={{ padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Download Defaults</h3>

                  <div className="toggle-group">
                    <div className="toggle-row">
                      <div className="toggle-details">
                        <span className="toggle-title">Embed Subtitles</span>
                        <span className="toggle-desc">Download and embed subtitles into video files.</span>
                      </div>
                      <label className="switch"><input type="checkbox" checked={settings.embedSubtitles} onChange={(e) => updateSetting({ embedSubtitles: e.target.checked })} /><span className="slider"></span></label>
                    </div>
                    <div className="toggle-row">
                      <div className="toggle-details">
                        <span className="toggle-title">SponsorBlock</span>
                        <span className="toggle-desc">Remove sponsor segments from YouTube downloads.</span>
                      </div>
                      <label className="switch"><input type="checkbox" checked={settings.sponsorBlock} onChange={(e) => updateSetting({ sponsorBlock: e.target.checked })} /><span className="slider"></span></label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-plugin config lives in each plugin's own page */}
            <div className="info-banner" style={{ margin: 0 }}>
              <Sliders size={18} />
              <div style={{ flex: 1 }}>
                <strong>Configuring download tools</strong>
                <p style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Each CLI tool (yt-dlp, spotDL, gallery-dl, Lux…) has its own settings — binary path, format, cookies, etc.
                  Open the <strong>Plugins</strong> tab, pick a plugin, and click <strong>Settings</strong>.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 14px', flexShrink: 0 }} onClick={() => { setActiveTab('plugins'); setSelectedPlugin(null); }}>
                <Puzzle size={14} /> Open Plugins
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
