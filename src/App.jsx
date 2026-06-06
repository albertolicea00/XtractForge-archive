import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, ListOrdered, Settings as SettingsIcon, Folder, Play,
  CheckCircle2, AlertTriangle, Trash2, Sliders, Search, Sparkles,
  Clock, User, FileVideo, Music, XCircle, ExternalLink, ChevronRight,
  RefreshCw, HardDrive, Puzzle, Zap, ToggleLeft, ToggleRight,
  UploadCloud, FolderOpen, Bot,
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

  // Format selection
  const [downloadType, setDownloadType] = useState('video');
  const [selectedResolution, setSelectedResolution] = useState('best');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('mp3');
  const [selectedCustomFormat, setSelectedCustomFormat] = useState('');

  // Download queue
  const [queue, setQueue] = useState([]);

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

  // Ollama discover
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverResults, setDiscoverResults] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState(null);

  // Import plugin feedback
  const [importResult, setImportResult] = useState(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  const refreshPlugins = useCallback(async () => {
    setCheckingDeps(true);
    try {
      const status = await window.api.checkDependencies();
      setPluginStatus(status);
      const configs = await window.api.getPluginConfigs();
      setPluginConfigs(configs);
      const folder = await window.api.getDefaultDownloadsFolder();
      setSettings(prev => ({ ...prev, downloadFolder: folder }));
    } catch (err) {
      console.error('Failed to check dependencies:', err);
    } finally {
      setCheckingDeps(false);
    }
  }, []);

  useEffect(() => {
    refreshPlugins();

    const unsub1 = window.api.onDownloadProgress((data) => {
      setQueue(prev => prev.map(item =>
        item.id === data.downloadId
          ? { ...item, percent: data.percent, speed: data.speed, eta: data.eta, size: data.size, status: 'downloading' }
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

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [refreshPlugins]);

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
      const response = await window.api.getVideoInfo(target);
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

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder();
    if (folder) setSettings(prev => ({ ...prev, downloadFolder: folder }));
  };

  // ── Ollama Discover tab ───────────────────────────────────────────────────

  const handleDiscover = async (e) => {
    if (e) e.preventDefault();
    if (!discoverQuery.trim()) return;
    setDiscoverLoading(true);
    setDiscoverError(null);
    setDiscoverResults([]);
    try {
      const res = await window.api.ollamaSearch(discoverQuery.trim());
      setDiscoverResults(res.results || []);
    } catch (err) {
      setDiscoverError(err.message || 'Ollama search failed.');
    } finally {
      setDiscoverLoading(false);
    }
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

  const handleSaveSettings = async () => {
    await window.api.saveSettings(settings);
    await window.api.savePluginConfigs(pluginConfigs);
    await refreshPlugins();
  };

  // ── Active plugins for sidebar ────────────────────────────────────────────

  const availableDownloaders = Object.entries(pluginStatus)
    .filter(([, p]) => p.type === 'downloader' && p.available)
    .map(([id, p]) => ({ id, ...p }));

  const downloaderPlugins = Object.entries(pluginStatus).filter(([, p]) => p.type === 'downloader');
  const searcherPlugins = Object.entries(pluginStatus).filter(([, p]) => p.type === 'searcher');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Download /></div>
          <span className="brand-name">XtractForge</span>
        </div>

        <ul className="nav-links">
          {[
            { id: 'download', icon: <Download />, label: 'Download' },
            { id: 'queue', icon: <ListOrdered />, label: `Queue (${queue.length})` },
            { id: 'discover', icon: <Bot />, label: 'AI Discover' },
            { id: 'plugins', icon: <Puzzle />, label: 'Plugins' },
            { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
          ].map(({ id, icon, label }) => (
            <li
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
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
                <span style={{ fontSize: '11px' }}>{p.icon} {p.name}</span>
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
      <main className="main-content">

        {/* ── TAB: Download ───────────────────────────────────────────────── */}
        {activeTab === 'download' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Analyze Media URL</h2>
              <form onSubmit={handleAnalyze}>
                <div className="input-group">
                  <label htmlFor="url-input">
                    URL — YouTube, Spotify, Bilibili, DeviantArt, and more
                    {detectedPlugin && pluginStatus[detectedPlugin] && (
                      <span style={{ marginLeft: '8px', color: 'var(--primary)', fontSize: '11px' }}>
                        {pluginStatus[detectedPlugin].icon} via {pluginStatus[detectedPlugin].name}
                      </span>
                    )}
                  </label>
                  <div className="input-container">
                    <input
                      id="url-input"
                      type="text"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={analyzing}
                    />
                    <button type="submit" className="input-icon-btn" disabled={analyzing || !url.trim()}>
                      {analyzing ? <RefreshCw className="spinner" size={20} /> : <Search size={20} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={analyzing || !url.trim()}>
                    {analyzing ? <><RefreshCw className="spinner" size={16} /> Analyzing...</> : <><Search size={16} /> Analyze</>}
                  </button>
                </div>
              </form>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <Folder size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Save to: <strong>{settings.downloadFolder || 'Not selected'}</strong>
                        </span>
                      </div>
                      <button onClick={handleSelectFolder} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Change</button>
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
                {queue.map(item => (
                  <div key={item.id} className="queue-item">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '96px', height: '54px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Download size={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    <div className="queue-item-info">
                      <div className="queue-item-title" title={item.title}>{item.title}</div>
                      {item.pluginId && pluginStatus[item.pluginId] && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {pluginStatus[item.pluginId].icon} {pluginStatus[item.pluginId].name}
                        </div>
                      )}
                      {item.status === 'downloading' && (
                        <>
                          <div className="queue-item-meta">
                            <span>Progress: {item.percent?.toFixed(1)}%</span>
                            <span>Size: {item.size}</span>
                            <span>Speed: {item.speed}</span>
                            <span>ETA: {item.eta}</span>
                          </div>
                          <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${item.percent || 0}%` }}></div>
                          </div>
                        </>
                      )}
                      {item.status === 'queued' && <div className="queue-item-meta"><span style={{ color: 'var(--text-muted)' }}>Waiting to start...</span></div>}
                      {item.status === 'completed' && <div className="queue-item-meta" style={{ color: 'var(--text-success)' }}><CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Completed.</div>}
                      {item.status === 'error' && <div className="queue-item-meta" style={{ color: 'var(--text-error)', fontSize: '11px' }}><AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Error: {item.errorMsg}</div>}
                    </div>
                    <div className="queue-item-actions">
                      {item.status === 'downloading' && <><span className="badge badge-downloading">Downloading</span><button onClick={() => handleCancelDownload(item.id)} className="btn btn-danger" style={{ padding: '8px' }}><XCircle size={16} /></button></>}
                      {item.status === 'queued' && <span className="badge badge-queued">Queued</span>}
                      {item.status === 'completed' && <><span className="badge badge-completed">Done</span><button onClick={() => window.api.openFolder(item.folder)} className="btn btn-secondary" style={{ padding: '8px' }}><Folder size={16} /></button><button onClick={() => setQueue(prev => prev.filter(i => i.id !== item.id))} className="btn btn-secondary" style={{ padding: '8px' }}><Trash2 size={16} /></button></>}
                      {item.status === 'error' && <><span className="badge badge-error">Failed</span><button onClick={() => setQueue(prev => prev.filter(i => i.id !== item.id))} className="btn btn-secondary" style={{ padding: '8px' }}><Trash2 size={16} /></button></>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: AI Discover ────────────────────────────────────────────── */}
        {activeTab === 'discover' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Bot size={22} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>AI Content Discovery</h2>
                {pluginStatus['ollama'] && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: pluginStatus['ollama'].available ? 'var(--text-success)' : 'var(--text-muted)' }}>
                    {pluginStatus['ollama'].available ? `● Ollama: ${pluginStatus['ollama'].version}` : '○ Ollama not running'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Describe what you want to find. Ollama AI will suggest search queries — click any result to analyze and download it.
              </p>

              {!pluginStatus['ollama']?.available && (
                <div className="error-banner" style={{ marginBottom: '16px' }}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Ollama not running</strong>
                    <p style={{ fontSize: '12px', marginTop: '2px' }}>
                      Install from <a href="#" onClick={() => {}} style={{ color: 'var(--primary)' }}>ollama.com</a>, then run <code>ollama pull llama3</code>. Configure host in Settings → Plugins.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleDiscover}>
                <div className="input-group">
                  <label htmlFor="discover-input">What do you want to find?</label>
                  <div className="input-container">
                    <input
                      id="discover-input"
                      type="text"
                      placeholder="e.g. relaxing lofi music, Python tutorials, nature documentaries..."
                      value={discoverQuery}
                      onChange={(e) => setDiscoverQuery(e.target.value)}
                      disabled={discoverLoading}
                    />
                    <button type="submit" className="input-icon-btn" disabled={discoverLoading || !discoverQuery.trim()}>
                      {discoverLoading ? <RefreshCw className="spinner" size={20} /> : <Search size={20} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={discoverLoading || !discoverQuery.trim()}>
                    {discoverLoading ? <><RefreshCw className="spinner" size={16} /> Thinking...</> : <><Sparkles size={16} /> Discover</>}
                  </button>
                </div>
              </form>
            </div>

            {discoverError && (
              <div className="error-banner">
                <AlertTriangle size={20} />
                <div><strong>Discovery Error</strong><p style={{ marginTop: '4px', fontSize: '13px' }}>{discoverError}</p></div>
              </div>
            )}

            {discoverResults.length > 0 && (
              <div className="glass-card">
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
                  <Sparkles size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary)' }} />
                  AI Suggestions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {discoverResults.map((result, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '24px' }}>{result.type === 'audio' ? '🎵' : '▶️'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{result.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{result.description}</div>
                        <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{result.searchQuery}</code>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: '13px', flexShrink: 0 }}
                        onClick={() => {
                          setActiveTab('download');
                          handleAnalyze(null, result.searchQuery);
                        }}
                      >
                        <Search size={14} /> Analyze
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Plugins ────────────────────────────────────────────────── */}
        {activeTab === 'plugins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Puzzle size={20} style={{ color: 'var(--primary)' }} /> Plugins
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Enable or disable tools. Import community plugins (.js files following the XtractForge plugin interface).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={() => window.api.openPluginsDir()} style={{ fontSize: '13px', padding: '8px 14px' }}>
                    <FolderOpen size={14} /> Plugins Folder
                  </button>
                  <button className="btn btn-primary" onClick={handleImportPlugin} style={{ fontSize: '13px', padding: '8px 14px' }}>
                    <UploadCloud size={14} /> Import Plugin
                  </button>
                </div>
              </div>

              {importResult && (
                <div className={importResult.success ? 'error-banner' : 'error-banner'} style={{ marginBottom: '16px', borderColor: importResult.success ? 'var(--text-success)' : undefined }}>
                  {importResult.success ? <CheckCircle2 size={18} style={{ color: 'var(--text-success)' }} /> : <AlertTriangle size={18} />}
                  <div>
                    <strong>{importResult.success ? `Plugin "${importResult.id}" imported` : 'Import failed'}</strong>
                    {!importResult.success && <p style={{ fontSize: '12px', marginTop: '2px' }}>{importResult.error}</p>}
                  </div>
                </div>
              )}

              {/* Downloader plugins */}
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Downloaders</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {downloaderPlugins.map(([id, plugin]) => {
                  const enabled = !disabledPlugins.includes(id);
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: `1px solid ${enabled && plugin.available ? 'var(--border-color)' : 'var(--border-color)'}`, opacity: enabled ? 1 : 0.5 }}>
                      <div style={{ fontSize: '24px' }}>{plugin.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{plugin.name}</span>
                          {plugin.isBuiltin && <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', borderRadius: '10px' }}>built-in</span>}
                          <span style={{ fontSize: '11px', color: plugin.available ? 'var(--text-success)' : 'var(--text-error)' }}>
                            {plugin.available ? `● v${plugin.version}` : '○ not found'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{plugin.description}</div>
                        {plugin.repoUrl && (
                          <a href="#" onClick={(e) => { e.preventDefault(); }} style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ExternalLink size={10} /> {plugin.repoUrl}
                          </a>
                        )}
                        {!plugin.available && plugin.installHint && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Install: <code style={{ color: 'var(--text-secondary)' }}>{plugin.installHint}</code>
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                        onClick={() => handleTogglePlugin(id, enabled)}
                      >
                        {enabled ? <><ToggleRight size={14} style={{ color: 'var(--primary)' }} /> Enabled</> : <><ToggleLeft size={14} /> Disabled</>}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Searcher plugins */}
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>AI / Discovery</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searcherPlugins.map(([id, plugin]) => {
                  const enabled = !disabledPlugins.includes(id);
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', opacity: enabled ? 1 : 0.5 }}>
                      <div style={{ fontSize: '24px' }}>{plugin.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{plugin.name}</span>
                          {plugin.isBuiltin && <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', borderRadius: '10px' }}>built-in</span>}
                          <span style={{ fontSize: '11px', color: plugin.available ? 'var(--text-success)' : 'var(--text-error)' }}>
                            {plugin.available ? `● ${plugin.version}` : '○ not running'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{plugin.description}</div>
                        {plugin.repoUrl && (
                          <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ExternalLink size={10} /> {plugin.repoUrl}
                          </div>
                        )}
                        {!plugin.available && plugin.installHint && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {plugin.installHint}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                        onClick={() => handleTogglePlugin(id, enabled)}
                      >
                        {enabled ? <><ToggleRight size={14} style={{ color: 'var(--primary)' }} /> Enabled</> : <><ToggleLeft size={14} /> Disabled</>}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Building a plugin</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  A plugin is a single <code>.js</code> file exporting: <code>{'{ id, name, description, type, repoUrl, icon, configSchema, checkDependency, canHandle, getInfo, buildDownloadArgs, parseProgress }'}</code>.
                  Drop it in the Plugins Folder or use Import Plugin. See <code>electron/plugins/ytdlp.js</code> as a reference.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Settings ───────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card">
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Settings</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '20px' }}>Global defaults and per-plugin configuration.</p>

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
                    <input type="text" placeholder="50K, 10M (empty = unlimited)" value={settings.speedLimit} onChange={(e) => setSettings(prev => ({ ...prev, speedLimit: e.target.value }))} style={{ padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>yt-dlp Defaults</h3>

                  <div className="toggle-group">
                    <div className="toggle-row">
                      <div className="toggle-details">
                        <span className="toggle-title">Embed Subtitles</span>
                        <span className="toggle-desc">Download and embed subtitles into video files.</span>
                      </div>
                      <label className="switch"><input type="checkbox" checked={settings.embedSubtitles} onChange={(e) => setSettings(prev => ({ ...prev, embedSubtitles: e.target.checked }))} /><span className="slider"></span></label>
                    </div>
                    <div className="toggle-row">
                      <div className="toggle-details">
                        <span className="toggle-title">SponsorBlock</span>
                        <span className="toggle-desc">Remove sponsor segments from YouTube downloads.</span>
                      </div>
                      <label className="switch"><input type="checkbox" checked={settings.sponsorBlock} onChange={(e) => setSettings(prev => ({ ...prev, sponsorBlock: e.target.checked }))} /><span className="slider"></span></label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-plugin settings */}
            {Object.entries(pluginStatus).map(([id, plugin]) => {
              if (!plugin.configSchema || plugin.configSchema.length === 0) return null;
              const cfg = pluginConfigs[id] || {};
              return (
                <div key={id} className="glass-card">
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{plugin.icon}</span> {plugin.name} Settings
                    <span style={{ fontSize: '11px', color: plugin.available ? 'var(--text-success)' : 'var(--text-error)', fontWeight: 400 }}>
                      {plugin.available ? '● installed' : '○ not installed'}
                    </span>
                  </h3>
                  {plugin.repoUrl && <div style={{ fontSize: '11px', color: 'var(--primary)', marginBottom: '16px' }}>{plugin.repoUrl}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {plugin.configSchema.map(field => (
                      <div key={field.key} className="input-group" style={{ marginBottom: 0 }}>
                        <label>{field.label}</label>
                        {field.type === 'toggle' ? (
                          <label className="switch">
                            <input type="checkbox" checked={!!(cfg[field.key] ?? field.default)} onChange={(e) => setPluginConfigs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field.key]: e.target.checked } }))} />
                            <span className="slider"></span>
                          </label>
                        ) : field.type === 'select' ? (
                          <select value={cfg[field.key] ?? field.default} onChange={(e) => setPluginConfigs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field.key]: e.target.value } }))} style={{ padding: '10px 12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder={field.placeholder || ''} value={cfg[field.key] ?? field.default ?? ''} onChange={(e) => setPluginConfigs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field.key]: e.target.value } }))} style={{ padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={refreshPlugins} className="btn btn-secondary">Re-detect Tools</button>
              <button onClick={handleSaveSettings} className="btn btn-primary">Save Settings</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
