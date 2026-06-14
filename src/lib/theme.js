// Theme application — builds a :root CSS block from a theme + user settings and
// injects it. A theme is { variables: { '--x': value } } + optional raw `css`.

export const MONO_STACK = "'SFMono-Regular', 'JetBrains Mono', 'Fira Code', Consolas, monospace";

// Font-family presets for the Typography picker. value '' = use the theme's own font.
export const FONT_PRESETS = [
  { label: 'Theme default', value: '' },
  { label: 'System Sans', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { label: 'Outfit', value: "'Outfit', sans-serif" },
  { label: 'Monospace', value: MONO_STACK },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
];

// Body text weight options (headings keep their own inline weight).
export const FONT_WEIGHTS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Bold', value: '700' },
];

export const ACCENT_PRESETS = [
  '#adc6ff', '#60a5fa', '#2dd4bf', '#34d399', '#a3e635',
  '#fbbf24', '#fb923c', '#ff8a80', '#f472b6', '#e879f9',
  '#c4b5fd', '#818cf8',
];

export function hexToRgba(hex, alpha) {
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
export function parseRgb(str) {
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

export function buildThemeCss(theme, settings = {}) {
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

  // Font family: explicit user pick wins over the legacy mono toggle, which wins
  // over the theme's own --font-sans (left untouched when neither is set).
  const fontFamily = (settings.fontFamily || '').trim();
  if (fontFamily) vars['--font-sans'] = fontFamily;
  else if (settings.monoFont) vars['--font-sans'] = MONO_STACK;

  const body = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');

  // Text tweaks that cascade from <body> (inline-weighted elements like headings
  // keep their own weight; plain body copy inherits these).
  const textRules = [];
  const fw = settings.fontWeight;
  if (fw && fw !== 'normal') textRules.push(`font-weight: ${fw};`);
  const ls = settings.letterSpacing;
  if (typeof ls === 'number' && ls !== 0) textRules.push(`letter-spacing: ${ls / 100}em;`);
  const bodyCss = textRules.length ? `\nbody { ${textRules.join(' ')} }` : '';

  return `:root {\n${body}\n}\n${theme.css || ''}${bodyCss}`;
}

export function applyTheme(theme, settings) {
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
