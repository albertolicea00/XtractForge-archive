import React from 'react';
import { Settings as SettingsIcon, Folder, Check, RefreshCw, Globe, Sliders, Puzzle } from 'lucide-react';
import { LANGUAGES } from '../../i18n';

export default function SettingsTab({
  t, savedFlash, settings, handleSelectFolder, updateSetting, language, handleSetLanguage,
  appVersion, autoCheckUpdates, handleToggleAutoUpdates, handleCheckUpdates, checkingUpdate, updateInfo,
  setActiveTab, setSelectedPlugin,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header — matches the Plugins tab */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SettingsIcon size={22} style={{ color: 'var(--primary)' }} /> {t('settings.title')}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '520px', lineHeight: 1.5 }}>
            {t('settings.subtitle')}
          </p>
        </div>
        {savedFlash === 'global' && (
          <span style={{ fontSize: '12px', color: 'var(--text-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Check size={14} /> Saved
          </span>
        )}
      </div>

      <div className="glass-card">
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

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>{t('settings.language')}</label>
              <select value={language} onChange={(e) => handleSetLanguage(e.target.value)} style={{ padding: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('settings.languageDesc')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Download Defaults</h3>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Organize into folders</label>
              <select value={settings.organize || 'none'} onChange={(e) => updateSetting({ organize: e.target.value })} style={{ padding: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                <option value="none">Flat — all files in the folder</option>
                <option value="type">By type — Video / Audio / Images / Other</option>
                <option value="source">By source — one folder per tool</option>
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>How finished files are sorted inside your download folder.</span>
            </div>

            <div className="toggle-group">
              <div className="toggle-row">
                <div className="toggle-details">
                  <span className="toggle-title">Resumable downloads</span>
                  <span className="toggle-desc">Download to a temp folder first, then move on completion — lets yt-dlp/curl resume interrupted downloads.</span>
                </div>
                <label className="switch"><input type="checkbox" checked={settings.stageToTemp !== false} onChange={(e) => updateSetting({ stageToTemp: e.target.checked })} /><span className="slider"></span></label>
              </div>
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

      {/* Updates */}
      <div className="glass-card">
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Updates</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          XtractForge <strong>v{appVersion || '—'}</strong>. Releases are published on GitHub.
        </p>

        <div className="toggle-row" style={{ marginBottom: '16px' }}>
          <div className="toggle-details">
            <span className="toggle-title">Check for updates on startup</span>
            <span className="toggle-desc">Compare your version against the latest GitHub release when the app launches.</span>
          </div>
          <label className="switch">
            <input type="checkbox" checked={autoCheckUpdates} onChange={(e) => handleToggleAutoUpdates(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleCheckUpdates} disabled={checkingUpdate} style={{ fontSize: '13px', padding: '8px 14px' }}>
            {checkingUpdate ? <><RefreshCw className="spinner" size={14} /> Checking…</> : <><RefreshCw size={14} /> Check now</>}
          </button>
          {updateInfo && !checkingUpdate && (
            updateInfo.error ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Couldn't check: {updateInfo.error}</span>
            ) : updateInfo.hasUpdate ? (
              <span style={{ fontSize: '13px', color: 'var(--text-success)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Update available: v{updateInfo.latest}
                <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => window.api.openExternal(updateInfo.url || 'https://github.com/albertolicea00/XtractForge/releases/latest')}>
                  <Globe size={13} /> Download
                </button>
              </span>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} style={{ color: 'var(--text-success)' }} /> You're on the latest version{updateInfo.latest ? ` (v${updateInfo.latest})` : ''}.
              </span>
            )
          )}
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
  );
}
