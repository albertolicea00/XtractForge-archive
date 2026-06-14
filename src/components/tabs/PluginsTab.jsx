import React from 'react';
import { Puzzle, FolderOpen, UploadCloud, ShieldAlert, CheckCircle2, AlertTriangle, ChevronRight, Globe, Sliders, Check, Copy, HelpCircle } from 'lucide-react';
import { localizePlugin, resolveInstall } from '../../lib/plugins';

export default function PluginsTab({
  t, language, downloaderPlugins, disabledPlugins, checkingDeps, importResult,
  handleImportPlugin, handleTogglePlugin, openPluginDetail, selectedPlugin, setSelectedPlugin,
  pluginStatus, pluginConfigs, copiedInstall, handleCopyInstall, savedFlash, updatePluginConfig,
}) {
  // ── Detail / settings page ──
  if (selectedPlugin && pluginStatus[selectedPlugin]) {
    const id = selectedPlugin;
    const plugin = localizePlugin(pluginStatus[id], language);
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
  }

  // ── Card grid ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Puzzle size={22} style={{ color: 'var(--primary)' }} /> {t('plugins.title')}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '520px', lineHeight: 1.5 }}>
            {t('plugins.subtitle')}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {checkingDeps && downloaderPlugins.length === 0 &&
          [0, 1, 2, 3].map(i => <div key={`sk-${i}`} className="skeleton skeleton-card" />)}
        {downloaderPlugins.map(([id, rawPlugin]) => {
          const plugin = localizePlugin(rawPlugin, language);
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
  );
}
