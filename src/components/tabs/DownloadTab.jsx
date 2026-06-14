import React from 'react';
import { RefreshCw, AlertTriangle, Download, User, Folder, FileVideo, Music, Sliders, HelpCircle } from 'lucide-react';
import { getThumbnailUrl, formatDuration, formatBytes } from '../../lib/format';

export default function DownloadTab({
  t, url, setUrl, analyzing, handleAnalyze, chosenEngine, setChosenEngine,
  downloaderPlugins, disabledPlugins, availableDownloaders, detectedPlugin, pluginStatus,
  checkingDeps, analysisError, videoInfo, downloadType, setDownloadType,
  selectedResolution, setSelectedResolution, selectedAudioFormat, setSelectedAudioFormat,
  selectedCustomFormat, setSelectedCustomFormat, pluginOpts, setPluginOpts,
  settings, handleSelectFolder, handleDownload,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-card" style={{ padding: '56px 32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '46px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.05 }}>{t('download.title')}</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '12px' }}>
          {t('download.subtitle')}
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
              {analyzing ? <><RefreshCw className="spinner" size={16} /> {t('download.extracting')}</> : <>{t('download.extract')}</>}
            </button>
          </div>

          {/* Engine picker — default Auto lets XtractForge choose the best tool */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('download.engine')}</span>
            <select
              value={chosenEngine}
              onChange={(e) => setChosenEngine(e.target.value)}
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="auto">{t('download.autoDetect')}</option>
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

              {videoInfo._isGallery ? (
                <div style={{ padding: '16px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  gallery-dl will download all images/files in this gallery at original quality.
                </div>
              ) : videoInfo._plugin === 'spotdl' ? (
                <div style={{ padding: '16px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  spotDL will match and download all tracks via YouTube Music.
                  Configure format/bitrate in Settings → Plugins → spotDL.
                </div>
              ) : (videoInfo._downloadOptions && videoInfo._downloadOptions.length) ? (
                /* Plugin-declared download form — the plugin owns this UI */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {videoInfo._downloadOptions.map(field => (
                    <div key={field.key} className="input-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {field.label}
                        {field.help && <span className="help-tip" data-tip={field.help}><HelpCircle size={13} /></span>}
                      </label>
                      {field.type === 'toggle' ? (
                        <label className="switch">
                          <input type="checkbox" checked={!!(pluginOpts[field.key] ?? field.default)} onChange={(e) => setPluginOpts(prev => ({ ...prev, [field.key]: e.target.checked }))} />
                          <span className="slider"></span>
                        </label>
                      ) : field.type === 'select' ? (
                        <select value={pluginOpts[field.key] ?? field.default} onChange={(e) => setPluginOpts(prev => ({ ...prev, [field.key]: e.target.value }))} style={{ padding: '10px 12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input type="text" placeholder={field.placeholder || ''} value={pluginOpts[field.key] ?? field.default ?? ''} onChange={(e) => setPluginOpts(prev => ({ ...prev, [field.key]: e.target.value }))} style={{ padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '13px', outline: 'none' }} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (videoInfo._simpleDownload || !(videoInfo.formats && videoInfo.formats.length)) ? (
                <div style={{ padding: '16px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {detectedPlugin && pluginStatus[detectedPlugin]
                    ? `${pluginStatus[detectedPlugin].name} will download this directly to your folder. Options are configured in Settings → Plugins.`
                    : 'This will be downloaded directly to your folder.'}
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
  );
}
