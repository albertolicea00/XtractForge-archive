// XtractForge Default — the app's signature look: Nord-inspired arctic surfaces,
// emerald accent (#34d399), monospace UI. Shipped as the default theme.
module.exports = {
  id: 'xtractforge-default',
  name: 'XtractForge Default',
  description: 'Arctic surfaces, emerald accent, mono UI',
  author: 'XtractForge',
  repoUrl: '',
  mode: 'dark',
  swatches: ['#34d399', '#81a1c1', '#2e3440'],

  variables: {
    '--font-sans': "'SFMono-Regular', 'JetBrains Mono', 'Fira Code', Consolas, monospace",

    '--bg-deep': '#242933',
    '--bg-dark': '#2e3440',
    '--bg-card': 'rgba(46, 52, 64, 0.7)',
    '--bg-panel': 'rgba(36, 41, 51, 0.9)',
    '--bg-input': 'rgba(59, 66, 82, 0.45)',
    '--bg-hover': 'rgba(255, 255, 255, 0.04)',

    '--primary': '#34d399',
    '--primary-glow': 'rgba(52, 211, 153, 0.3)',
    '--accent': '#2dd4bf',
    '--accent-glow': 'rgba(45, 212, 191, 0.3)',

    '--gradient-primary': 'linear-gradient(135deg, #2dd4bf 0%, #34d399 50%, #4ade80 100%)',
    '--gradient-hover': 'linear-gradient(135deg, #26b8a6 0%, #2cba85 50%, #3fc46e 100%)',
    '--gradient-dark': 'linear-gradient(180deg, #2e3440 0%, #242933 100%)',

    '--text-primary': '#eceff4',
    '--text-secondary': '#abb2c0',
    '--text-muted': '#6c7689',
    '--text-success': '#34d399',
    '--text-error': '#bf616a',

    '--border-color': 'rgba(255, 255, 255, 0.08)',
    '--border-focus': 'rgba(52, 211, 153, 0.5)',
    '--shadow-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    '--shadow-glow': '0 0 20px rgba(52, 211, 153, 0.15)',
  },
};
