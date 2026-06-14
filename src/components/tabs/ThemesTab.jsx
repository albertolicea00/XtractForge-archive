import React from 'react';
import { Palette, FolderOpen, UploadCloud, CheckCircle2, AlertTriangle, Check, XCircle, Globe } from 'lucide-react';
import { ACCENT_PRESETS, FONT_PRESETS, FONT_WEIGHTS } from '../../lib/theme';

export default function ThemesTab({ t, themes, activeThemeId, handleSetTheme, themeImportResult, handleImportTheme, themeSettings, handleThemeSetting }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header — matches the Plugins tab */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={22} style={{ color: 'var(--primary)' }} /> {t('themes.title')}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '520px', lineHeight: 1.5 }}>
            {t('themes.subtitle')}
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
        <div className="error-banner" style={{ margin: 0, borderColor: themeImportResult.success ? 'var(--text-success)' : undefined }}>
          {themeImportResult.success ? <CheckCircle2 size={18} style={{ color: 'var(--text-success)' }} /> : <AlertTriangle size={18} />}
          <div>
            <strong>{themeImportResult.success ? `Theme "${themeImportResult.id}" imported` : 'Import failed'}</strong>
            {!themeImportResult.success && <p style={{ fontSize: '12px', marginTop: '2px' }}>{themeImportResult.error}</p>}
          </div>
        </div>
      )}

      {/* Visual Modes */}
      <div className="glass-card">
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>Visual Modes</h3>
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
                <div style={{ padding: '8px 10px 10px', background: 'var(--bg-hover)', height: '100%' }}>
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
              <label title="Pick from palette" style={{ position: 'relative', width: '22px', height: '22px', borderRadius: '50%', background: themeSettings.accentOverride || 'var(--primary)', border: '1px solid var(--border-color)', cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(themeSettings.accentOverride || '') ? themeSettings.accentOverride : '#8b5cf6'}
                  onChange={(e) => handleThemeSetting({ accentOverride: e.target.value })}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', padding: 0, border: 'none' }}
                />
              </label>
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
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Typography</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Font, weight and spacing for body text. "Theme default" keeps each theme's own font.
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Font Family</label>
              <select
                value={themeSettings.fontFamily || ''}
                onChange={(e) => handleThemeSetting({ fontFamily: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px', cursor: 'pointer' }}
              >
                {FONT_PRESETS.map(f => (
                  <option key={f.label} value={f.value} style={{ fontFamily: f.value || 'inherit' }}>{f.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Font Weight</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {FONT_WEIGHTS.map(w => {
                  const active = (themeSettings.fontWeight || 'normal') === w.value;
                  return (
                    <button
                      key={w.value}
                      onClick={() => handleThemeSetting({ fontWeight: w.value })}
                      style={{
                        flex: 1, padding: '9px 4px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: w.value === 'normal' ? 400 : Number(w.value),
                        background: active ? 'var(--primary)' : 'var(--bg-input)',
                        color: active ? 'var(--bg-dark)' : 'var(--text-secondary)',
                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                      }}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Letter Spacing</label>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>{(themeSettings.letterSpacing ?? 0) > 0 ? '+' : ''}{themeSettings.letterSpacing ?? 0}</span>
            </div>
            <input
              type="range"
              min="-5"
              max="20"
              step="1"
              value={themeSettings.letterSpacing ?? 0}
              onChange={(e) => handleThemeSetting({ letterSpacing: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
              <span>TIGHT</span><span>NORMAL</span><span>WIDE</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
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

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Zoom</h3>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>{themeSettings.fontScale ?? 100}%</span>
            </div>
            <input
              type="range"
              min="80"
              max="140"
              step="5"
              value={themeSettings.fontScale ?? 100}
              onChange={(e) => handleThemeSetting({ fontScale: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
              <span>SMALL</span><span>DEFAULT</span><span>LARGE</span>
            </div>
          </div>
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
  );
}
