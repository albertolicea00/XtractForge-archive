import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ListOrdered, 
  Settings as SettingsIcon, 
  Folder, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Sliders, 
  Search, 
  Sparkles, 
  Clock, 
  User, 
  FileVideo, 
  Music,
  XCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('download');
  const [dependencies, setDependencies] = useState({ ytdlp: false, ffmpeg: false, ytdlpVersion: '', ffmpegVersion: '' });
  const [checkingDeps, setCheckingDeps] = useState(true);
  
  // Downloader State
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  
  // Selected Download Options
  const [downloadType, setDownloadType] = useState('video'); // 'video' | 'audio' | 'custom'
  const [selectedResolution, setSelectedResolution] = useState('best'); // 'best' | '1080' | '720' | '480' | '360'
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('mp3'); // 'mp3' | 'm4a' | 'wav'
  const [selectedCustomFormat, setSelectedCustomFormat] = useState(''); // specific format ID
  
  // App Settings
  const [settings, setSettings] = useState({
    ytdlpPath: 'yt-dlp',
    ffmpegPath: 'ffmpeg',
    downloadFolder: '',
    speedLimit: '',
    embedSubtitles: false,
    sponsorBlock: false
  });
  
  // Download Queue State
  const [queue, setQueue] = useState([]);

  // Load dependency status and default folders
  const checkSystem = async () => {
    setCheckingDeps(true);
    try {
      const status = await window.api.checkDependencies();
      setDependencies(status);
      
      const defaultFolder = await window.api.getDefaultDownloadsFolder();
      setSettings(prev => ({ ...prev, downloadFolder: defaultFolder }));
    } catch (err) {
      console.error('Failed to check dependencies:', err);
    } finally {
      setCheckingDeps(false);
    }
  };

  useEffect(() => {
    checkSystem();

    // Register Electron IPC listeners for progress
    const unsubscribeProgress = window.api.onDownloadProgress((data) => {
      setQueue(prevQueue => prevQueue.map(item => {
        if (item.id === data.downloadId) {
          return {
            ...item,
            percent: data.percent,
            speed: data.speed,
            eta: data.eta,
            size: data.size,
            status: 'downloading'
          };
        }
        return item;
      }));
    });

    const unsubscribeComplete = window.api.onDownloadComplete((data) => {
      setQueue(prevQueue => prevQueue.map(item => {
        if (item.id === data.downloadId) {
          return {
            ...item,
            status: 'completed',
            percent: 100
          };
        }
        return item;
      }));
    });

    const unsubscribeError = window.api.onDownloadError((data) => {
      setQueue(prevQueue => prevQueue.map(item => {
        if (item.id === data.downloadId) {
          return {
            ...item,
            status: 'error',
            errorMsg: data.error
          };
        }
        return item;
      }));
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, []);

  // Handle URL Analysis
  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setVideoInfo(null);

    try {
      const response = await window.api.getVideoInfo(url.trim());
      if (response.success) {
        setVideoInfo(response.data);
        
        // Auto-select first custom format if available
        if (response.data.formats && response.data.formats.length > 0) {
          // Filter out audio-only and formats without resolution for default custom choice
          const videoFormats = response.data.formats.filter(f => f.vcodec !== 'none' && f.resolution);
          if (videoFormats.length > 0) {
            setSelectedCustomFormat(videoFormats[videoFormats.length - 1].format_id);
          }
        }
      }
    } catch (err) {
      setAnalysisError(err.message || 'Error fetching video information. Please verify the URL.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Trigger Download
  const handleDownload = async (isDirect = false) => {
    if (!videoInfo) return;

    const downloadId = Date.now().toString();
    const title = videoInfo.title || 'Video Download';
    const thumbnail = getThumbnailUrl(videoInfo);
    
    // Determine the format argument for yt-dlp
    let formatArg = '';
    let isAudio = false;

    if (downloadType === 'video') {
      if (selectedResolution === 'best') {
        formatArg = 'bestvideo+bestaudio/best';
      } else {
        formatArg = `bestvideo[height<=${selectedResolution}]+bestaudio/best`;
      }
    } else if (downloadType === 'audio') {
      isAudio = true;
    } else if (downloadType === 'custom') {
      formatArg = selectedCustomFormat;
    }

    const downloadOptions = {
      format: isAudio ? null : formatArg,
      audioOnly: isAudio,
      audioFormat: selectedAudioFormat,
      downloadFolder: settings.downloadFolder,
      speedLimit: settings.speedLimit,
      embedSubtitles: settings.embedSubtitles,
      sponsorBlock: settings.sponsorBlock
    };

    // Add to local queue state
    const newQueueItem = {
      id: downloadId,
      title,
      thumbnail,
      url: url.trim(),
      percent: 0,
      speed: '0 B/s',
      eta: '--:--',
      size: 'Unknown',
      status: 'queued',
      errorMsg: '',
      folder: settings.downloadFolder,
      audioOnly: isAudio
    };

    setQueue(prev => [newQueueItem, ...prev]);

    // Switch to queue tab if not direct download
    if (!isDirect) {
      setActiveTab('queue');
    }

    // Start download process in main
    try {
      await window.api.startDownload(downloadId, url.trim(), downloadOptions);
    } catch (err) {
      setQueue(prev => prev.map(item => {
        if (item.id === downloadId) {
          return { ...item, status: 'error', errorMsg: err.message };
        }
        return item;
      }));
    }
  };

  const handleCancelDownload = async (id) => {
    try {
      await window.api.cancelDownload(id);
      setQueue(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, status: 'error', errorMsg: 'Cancelled by user' };
        }
        return item;
      }));
    } catch (e) {
      console.error('Error cancelling download:', e);
    }
  };

  const handleRemoveFromQueue = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  const handleSelectFolder = async () => {
    try {
      const folder = await window.api.selectFolder();
      if (folder) {
        setSettings(prev => ({ ...prev, downloadFolder: folder }));
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
    }
  };

  const handleOpenFolder = async (folderPath) => {
    await window.api.openFolder(folderPath || settings.downloadFolder);
  };

  // Helper: Get best thumbnail from yt-dlp metadata
  const getThumbnailUrl = (info) => {
    if (!info) return '';
    if (info.thumbnail) return info.thumbnail;
    if (info.thumbnails && info.thumbnails.length > 0) {
      // Return the last one (usually highest resolution)
      return info.thumbnails[info.thumbnails.length - 1].url;
    }
    return '';
  };

  // Helper: Format duration (seconds to HH:MM:SS)
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Parse size to readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="app-container">
      {/* Decorative Blur Backgrounds */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Download />
          </div>
          <span className="brand-name">XtractForge</span>
        </div>
        
        <ul className="nav-links">
          <li 
            className={`nav-item ${activeTab === 'download' ? 'active' : ''}`}
            onClick={() => setActiveTab('download')}
          >
            <Download />
            <span>Download</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <ListOrdered />
            <span>Queue ({queue.length})</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon />
            <span>Settings</span>
          </li>
        </ul>
        
        <div className="sidebar-footer">
          <div className="dependency-status">
            <div className="status-badge">
              <span className={`status-indicator ${dependencies.ytdlp ? 'success' : 'error'}`}></span>
              <span>yt-dlp: {dependencies.ytdlp ? 'Active' : 'Missing'}</span>
            </div>
            <div className="status-badge">
              <span className={`status-indicator ${dependencies.ffmpeg ? 'success' : 'error'}`}></span>
              <span>ffmpeg: {dependencies.ffmpeg ? 'Active' : 'Missing'}</span>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px', fontSize: '11px', marginTop: '8px' }}
              onClick={checkSystem}
              disabled={checkingDeps}
            >
              <RefreshCw size={12} className={checkingDeps ? 'spinner' : ''} />
              Recheck
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Panel Content */}
      <main className="main-content">
        
        {/* Warning Banner if dependencies are missing */}
        {!checkingDeps && (!dependencies.ytdlp || !dependencies.ffmpeg) && (
          <div className="error-banner">
            <AlertTriangle size={20} />
            <div>
              <strong>Missing System Dependencies!</strong>
              <p style={{ marginTop: '4px', fontSize: '13px' }}>
                {!dependencies.ytdlp && "• 'yt-dlp' could not be found on your system. "}
                {!dependencies.ffmpeg && "• 'ffmpeg' is missing (required to merge audio/video formats)."}
                <br />
                Please install them or specify their executable paths in the Settings tab.
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: Downloader */}
        {activeTab === 'download' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Input URL Section */}
            <div className="glass-card">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Analyze Video URL</h2>
              <form onSubmit={handleAnalyze}>
                <div className="input-group">
                  <label htmlFor="url-input">Enter URL (YouTube, Vimeo, Twitter, etc.)</label>
                  <div className="input-container">
                    <input 
                      id="url-input"
                      type="text" 
                      placeholder="https://www.youtube.com/watch?v=..." 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={analyzing}
                    />
                    <button 
                      type="submit" 
                      className="input-icon-btn"
                      disabled={analyzing || !url.trim()}
                    >
                      {analyzing ? <RefreshCw className="spinner" size={20} /> : <Search size={20} />}
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={analyzing || !url.trim()}
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="spinner" size={16} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        Analyze URL
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Error Message for Analysis */}
            {analysisError && (
              <div className="error-banner">
                <AlertTriangle size={20} />
                <div>
                  <strong>Analysis Error</strong>
                  <p style={{ marginTop: '4px', fontSize: '13px' }}>{analysisError}</p>
                </div>
              </div>
            )}

            {/* Analysis Result Options */}
            {videoInfo && (
              <div className="glass-card" style={{ animation: 'fadeIn 0.3s ease' }}>
                <div className="analysis-container">
                  {/* Left Column: Media Preview */}
                  <div className="video-details-info">
                    <div className="video-thumbnail-wrapper">
                      <img 
                        className="video-thumbnail" 
                        src={getThumbnailUrl(videoInfo) || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500'} 
                        alt={videoInfo.title} 
                      />
                      {videoInfo.duration && (
                        <div className="video-duration">{formatDuration(videoInfo.duration)}</div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '12px' }}>
                      <h3 className="video-title">{videoInfo.title}</h3>
                      <div className="video-channel">
                        <User size={14} />
                        <span>{videoInfo.uploader || videoInfo.channel || 'Unknown Author'}</span>
                      </div>
                    </div>

                    <div className="video-meta-grid">
                      <div className="meta-card">
                        <div className="meta-card-label">Duration</div>
                        <div className="meta-card-value">{formatDuration(videoInfo.duration) || 'Unknown'}</div>
                      </div>
                      <div className="meta-card">
                        <div className="meta-card-label">Views</div>
                        <div className="meta-card-value">
                          {videoInfo.view_count ? videoInfo.view_count.toLocaleString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Download Configuration */}
                  <div className="format-selection-container">
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Download Options</h3>
                    
                    <div className="tabs">
                      <button 
                        className={`tab ${downloadType === 'video' ? 'active' : ''}`}
                        onClick={() => setDownloadType('video')}
                      >
                        <FileVideo size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Video
                      </button>
                      <button 
                        className={`tab ${downloadType === 'audio' ? 'active' : ''}`}
                        onClick={() => setDownloadType('audio')}
                      >
                        <Music size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Audio Only (MP3/M4A)
                      </button>
                      {videoInfo.formats && (
                        <button 
                          className={`tab ${downloadType === 'custom' ? 'active' : ''}`}
                          onClick={() => setDownloadType('custom')}
                        >
                          <Sliders size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                          Advanced Formats
                        </button>
                      )}
                    </div>

                    {/* Tab View 1: Standard Video Presets */}
                    {downloadType === 'video' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="input-group">
                          <label>Select Video Quality</label>
                          <select 
                            style={{
                              padding: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              outline: 'none',
                              fontFamily: 'var(--font-sans)',
                              fontSize: '14px'
                            }}
                            value={selectedResolution}
                            onChange={(e) => setSelectedResolution(e.target.value)}
                          >
                            <option value="best">Best Quality Available (4K / 1080p / 720p)</option>
                            <option value="1080">Full HD (1080p)</option>
                            <option value="720">HD (720p)</option>
                            <option value="480">Standard (480p)</option>
                            <option value="360">Low (360p)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Tab View 2: Audio Only Options */}
                    {downloadType === 'audio' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="input-group">
                          <label>Audio Format</label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {['mp3', 'm4a', 'wav'].map(fmt => (
                              <label 
                                key={fmt}
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  padding: '12px',
                                  background: selectedAudioFormat === fmt ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
                                  border: selectedAudioFormat === fmt ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  textTransform: 'uppercase'
                                }}
                              >
                                <input 
                                  type="radio" 
                                  name="audio-format" 
                                  value={fmt}
                                  checked={selectedAudioFormat === fmt}
                                  onChange={() => setSelectedAudioFormat(fmt)}
                                  style={{ accentColor: 'var(--primary)' }}
                                />
                                {fmt}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab View 3: Advanced Formats Table */}
                    {downloadType === 'custom' && videoInfo.formats && (
                      <div className="formats-table-wrapper">
                        <table className="formats-table">
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}></th>
                              <th>ID</th>
                              <th>Ext</th>
                              <th>Resolution</th>
                              <th>FPS</th>
                              <th>Est. Size</th>
                              <th>Info / Codec</th>
                            </tr>
                          </thead>
                          <tbody>
                            {videoInfo.formats
                              .filter(f => f.resolution || f.vcodec !== 'none')
                              .map(format => (
                                <tr 
                                  key={format.format_id}
                                  onClick={() => setSelectedCustomFormat(format.format_id)}
                                  className={selectedCustomFormat === format.format_id ? 'selected' : ''}
                                >
                                  <td>
                                    <input 
                                      type="radio" 
                                      name="custom-format" 
                                      value={format.format_id}
                                      checked={selectedCustomFormat === format.format_id}
                                      onChange={() => setSelectedCustomFormat(format.format_id)}
                                    />
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{format.format_id}</td>
                                  <td>{format.ext}</td>
                                  <td>{format.resolution || 'audio only'}</td>
                                  <td>{format.fps || '-'}</td>
                                  <td>
                                    {format.filesize ? formatBytes(format.filesize) : 
                                     format.filesize_approx ? `~${formatBytes(format.filesize_approx)}` : '-'}
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                    {format.format_note || format.acodec || format.vcodec}
                                  </td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Target Folder Confirmation */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      marginTop: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <Folder size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Save to: <strong>{settings.downloadFolder || 'Not selected'}</strong>
                        </span>
                      </div>
                      <button 
                        onClick={handleSelectFolder}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Change
                      </button>
                    </div>

                    {/* Download Controls */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button 
                        onClick={() => handleDownload(false)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '14px' }}
                      >
                        <Download size={18} />
                        Download Now
                      </button>
                      <button 
                        onClick={() => handleOpenFolder()}
                        className="btn btn-secondary"
                        title="Open Destination Folder"
                        style={{ padding: '14px' }}
                      >
                        <Folder size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Downloads Queue */}
        {activeTab === 'queue' && (
          <div className="glass-card">
            <div className="queue-header">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Download Queue</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Manage active downloads and download history.
                </p>
              </div>
              
              {queue.some(item => item.status === 'completed') && (
                <button 
                  onClick={handleClearCompleted}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                >
                  <Trash2 size={14} />
                  Clear Completed
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="empty-state">
                <Download />
                <h3>No active downloads</h3>
                <p style={{ fontSize: '14px', marginTop: '4px' }}>
                  Head over to the "Download" tab, analyze a link, and start a download.
                </p>
              </div>
            ) : (
              <div className="queue-list">
                {queue.map(item => (
                  <div key={item.id} className="queue-item">
                    {/* Item Thumbnail */}
                    <img 
                      src={item.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150'} 
                      alt="" 
                      style={{
                        width: '96px',
                        height: '54px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        flexShrink: 0
                      }}
                    />

                    {/* Progress Info */}
                    <div className="queue-item-info">
                      <div className="queue-item-title" title={item.title}>
                        {item.title}
                      </div>

                      {item.status === 'downloading' && (
                        <>
                          <div className="queue-item-meta">
                            <span>Progress: {item.percent}%</span>
                            <span>Size: {item.size}</span>
                            <span>Speed: {item.speed}</span>
                            <span>ETA: {item.eta}</span>
                          </div>
                          <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${item.percent}%` }}></div>
                          </div>
                        </>
                      )}

                      {item.status === 'queued' && (
                        <div className="queue-item-meta">
                          <span style={{ color: 'var(--text-muted)' }}>Waiting to start...</span>
                        </div>
                      )}

                      {item.status === 'completed' && (
                        <div className="queue-item-meta" style={{ color: 'var(--text-success)' }}>
                          <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          Download completed successfully.
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="queue-item-meta" style={{ color: 'var(--text-error)', fontSize: '11px' }}>
                          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          Error: {item.errorMsg}
                        </div>
                      )}
                    </div>

                    {/* Badge & Action Buttons */}
                    <div className="queue-item-actions">
                      {item.status === 'downloading' && (
                        <>
                          <span className="badge badge-downloading">Downloading</span>
                          <button 
                            onClick={() => handleCancelDownload(item.id)}
                            className="btn btn-danger"
                            style={{ padding: '8px' }}
                            title="Cancel Download"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}

                      {item.status === 'queued' && (
                        <span className="badge badge-queued">Queued</span>
                      )}

                      {item.status === 'completed' && (
                        <>
                          <span className="badge badge-completed">Completed</span>
                          <button 
                            onClick={() => handleOpenFolder(item.folder)}
                            className="btn btn-secondary"
                            style={{ padding: '8px' }}
                            title="Show in Folder"
                          >
                            <Folder size={16} />
                          </button>
                          <button 
                            onClick={() => handleRemoveFromQueue(item.id)}
                            className="btn btn-secondary"
                            style={{ padding: '8px' }}
                            title="Remove from list"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}

                      {item.status === 'error' && (
                        <>
                          <span className="badge badge-error">Failed</span>
                          <button 
                            onClick={() => handleRemoveFromQueue(item.id)}
                            className="btn btn-secondary"
                            style={{ padding: '8px' }}
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Settings */}
        {activeTab === 'settings' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>XtractForge Settings</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Configure system binary paths and default download preferences.
              </p>
            </div>

            <div className="settings-grid">
              {/* Left Column: Folders & System */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  System & Folders
                </h3>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Default Downloads Folder</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={settings.downloadFolder} 
                      readOnly
                      style={{
                        flexGrow: 1,
                        padding: '12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <button 
                      onClick={handleSelectFolder}
                      className="btn btn-secondary"
                      style={{ padding: '12px' }}
                    >
                      <Folder size={16} />
                      Browse
                    </button>
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Executable Path for yt-dlp (optional)</label>
                  <input 
                    type="text" 
                    placeholder="Absolute path or command, E.g.: /usr/local/bin/yt-dlp"
                    value={settings.ytdlpPath}
                    onChange={(e) => setSettings(prev => ({ ...prev, ytdlpPath: e.target.value }))}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    By default, searches for 'yt-dlp' in your system's global PATH environment variables.
                  </p>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Executable Path for ffmpeg (optional)</label>
                  <input 
                    type="text" 
                    placeholder="Absolute path or command, E.g.: /usr/local/bin/ffmpeg"
                    value={settings.ffmpegPath}
                    onChange={(e) => setSettings(prev => ({ ...prev, ffmpegPath: e.target.value }))}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Download limits and extras */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Limits & Features
                </h3>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Download Speed Limit</label>
                  <input 
                    type="text" 
                    placeholder="E.g.: 50K (50 KB/s), 10M (10 MB/s), leave empty for unlimited"
                    value={settings.speedLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, speedLimit: e.target.value }))}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div className="toggle-group">
                  <div className="toggle-row">
                    <div className="toggle-details">
                      <span className="toggle-title">Embed Subtitles</span>
                      <span className="toggle-desc">Download and embed available subtitles into the video file.</span>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={settings.embedSubtitles}
                        onChange={(e) => setSettings(prev => ({ ...prev, embedSubtitles: e.target.checked }))}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-details">
                      <span className="toggle-title">SponsorBlock Integration</span>
                      <span className="toggle-desc">Automatically remove sponsored segments from downloaded videos.</span>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={settings.sponsorBlock}
                        onChange={(e) => setSettings(prev => ({ ...prev, sponsorBlock: e.target.checked }))}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '20px',
              marginTop: '12px'
            }}>
              <button 
                onClick={checkSystem} 
                className="btn btn-secondary"
              >
                Re-detect System Tools
              </button>
              <button 
                onClick={() => {
                  checkSystem();
                  alert('Settings saved successfully!');
                }}
                className="btn btn-primary"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
