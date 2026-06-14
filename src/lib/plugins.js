// Pure plugin helpers — no React, no DOM.

// Overlay a plugin's own per-language strings (plugin.locales[lang]) onto its
// base (English) fields, so plugin-provided text is translated too.
export function localizePlugin(p, lang) {
  const loc = p && p.locales && p.locales[lang];
  if (!loc) return p;
  return {
    ...p,
    description: loc.description ?? p.description,
    tag: loc.tag ?? p.tag,
    installHint: loc.installHint ?? p.installHint,
    configSchema: (p.configSchema || []).map(f => {
      const lf = loc.fields && loc.fields[f.key];
      return lf ? { ...f, label: lf.label ?? f.label, help: lf.help ?? f.help } : f;
    }),
  };
}

// Pick the OS-appropriate install command for a plugin, falling back to the
// generic installHint. plugin.install is an optional { darwin, win32, linux, default } map.
export function resolveInstall(plugin, platform) {
  if (plugin.install && typeof plugin.install === 'object') {
    return plugin.install[platform] || plugin.install.default || plugin.installHint || '';
  }
  return plugin.installHint || '';
}
