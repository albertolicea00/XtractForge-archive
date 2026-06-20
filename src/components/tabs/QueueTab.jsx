import React from 'react';
import { Trash2, Download, ChevronRight, Pause, Play, XCircle, Folder } from 'lucide-react';
import { QUEUE_STATUS } from '../../lib/queue';
import { formatBytes, parseSpeedToBps } from '../../lib/format';

export default function QueueTab({
  t, queue, setQueue, logs, expandedLogs, toggleLog, pluginStatus,
  handlePauseDownload, handleResumeDownload, handleCancelDownload, moveQueueItem, diskFree,
}) {
  return (
    <div className="glass-card">
      <div className="queue-header">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('queue.title')}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{t('queue.subtitle')}</p>
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
                  {item.isPlaylist && (
                    <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '1px 6px', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', borderRadius: '10px' }}>
                      Playlist{item.entryCount ? ` · ${item.entryCount}` : ''}
                    </span>
                  )}
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
                {(item.status === 'downloading' || item.status === 'paused' || item.status === 'queued') && (
                  <>
                    {item.status === 'downloading' && (
                      <button onClick={() => handlePauseDownload(item.id)} className="btn btn-secondary" style={{ padding: '8px' }} title="Pause"><Pause size={16} /></button>
                    )}
                    {item.status === 'paused' && (
                      <button onClick={() => handleResumeDownload(item.id)} className="btn btn-secondary" style={{ padding: '8px' }} title="Resume"><Play size={16} /></button>
                    )}
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
  );
}
