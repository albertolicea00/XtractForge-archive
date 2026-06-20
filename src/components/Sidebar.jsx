import React from 'react';
import { Download, ListOrdered, Puzzle, Palette, Settings as SettingsIcon, RefreshCw } from 'lucide-react';

export default function Sidebar({ t, appVersion, updateInfo, activeTab, setActiveTab, setSelectedPlugin, queueCount, checkingDeps, availableDownloaders, refreshPlugins }) {
  return (
    <aside className="sidebar">
      <div className="brand" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
        <span className="brand-name">XtractForge</span>
        {appVersion && (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            v{appVersion}{updateInfo?.hasUpdate ? ' · update available' : ''}
          </span>
        )}
      </div>

      <ul className="nav-links">
        {[
          { id: 'download', icon: <Download />, label: t('nav.download') },
          { id: 'queue', icon: <ListOrdered />, label: `${t('nav.queue')} (${queueCount})` },
          { id: 'plugins', icon: <Puzzle />, label: t('nav.plugins') },
          { id: 'themes', icon: <Palette />, label: t('nav.themes') },
          { id: 'settings', icon: <SettingsIcon />, label: t('nav.settings') },
        ].map(({ id, icon, label }) => (
          <li
            key={id}
            className={`nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => {
              if (id === 'settings') {
                window.api.openSettingsWindow();
              } else {
                setActiveTab(id);
                if (id === 'plugins') setSelectedPlugin(null);
              }
            }}
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
          {checkingDeps && availableDownloaders.length === 0 && (
            [0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: '12px', width: `${70 - i * 12}%` }} />)
          )}
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
  );
}
