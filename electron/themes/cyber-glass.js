// Cyber-Glass — the default XtractForge look: glassmorphic dark with violet accents.
// A theme is a plain CommonJS module exporting metadata + a `variables` map of
// CSS custom properties applied to :root. Optionally add raw `css` for advanced tweaks.
module.exports = {
  id: 'cyber-glass',
  name: 'Cyber-Glass',
  description: 'High-performance dark utility',
  author: 'XtractForge',
  repoUrl: '',
  mode: 'dark',
  // Three preview dots shown on the theme card
  swatches: ['#8b5cf6', '#d946ef', '#16161d'],

  variables: {
    '--bg-deep': '#08080a',
    '--bg-dark': '#0f0f13',
    '--bg-card': 'rgba(22, 22, 29, 0.7)',
    '--bg-panel': 'rgba(16, 16, 21, 0.9)',
    '--bg-input': 'rgba(30, 30, 40, 0.5)',
    '--bg-hover': 'rgba(255, 255, 255, 0.04)',

    '--primary': '#8b5cf6',
    '--primary-glow': 'rgba(139, 92, 246, 0.3)',
    '--accent': '#d946ef',
    '--accent-glow': 'rgba(217, 70, 239, 0.3)',

    '--gradient-primary': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
    '--gradient-hover': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c084fc 100%)',
    '--gradient-dark': 'linear-gradient(180deg, #13131a 0%, #08080a 100%)',

    '--text-primary': '#f8fafc',
    '--text-secondary': '#94a3b8',
    '--text-muted': '#64748b',
    '--text-success': '#10b981',
    '--text-error': '#f43f5e',

    '--border-color': 'rgba(255, 255, 255, 0.08)',
    '--border-focus': 'rgba(139, 92, 246, 0.5)',
    '--shadow-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    '--shadow-glow': '0 0 20px rgba(139, 92, 246, 0.15)',
  },
};
