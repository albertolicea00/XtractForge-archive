// Matrix — high-contrast terminal style. Pure black, phosphor green, mono everywhere.
module.exports = {
  id: 'matrix',
  name: 'Matrix',
  description: 'High-contrast terminal style',
  author: 'XtractForge',
  repoUrl: '',
  mode: 'dark',
  swatches: ['#00ff66', '#00aa44', '#000000'],

  variables: {
    '--font-sans': "'SFMono-Regular', 'JetBrains Mono', 'Fira Code', Consolas, monospace",

    '--bg-deep': '#000000',
    '--bg-dark': '#020402',
    '--bg-card': 'rgba(4, 14, 6, 0.85)',
    '--bg-panel': 'rgba(2, 8, 3, 0.95)',
    '--bg-input': 'rgba(0, 255, 102, 0.04)',
    '--bg-hover': 'rgba(0, 255, 102, 0.06)',

    '--primary': '#00ff66',
    '--primary-glow': 'rgba(0, 255, 102, 0.35)',
    '--accent': '#00aa44',
    '--accent-glow': 'rgba(0, 170, 68, 0.3)',

    '--gradient-primary': 'linear-gradient(135deg, #00aa44 0%, #00ff66 50%, #66ff99 100%)',
    '--gradient-hover': 'linear-gradient(135deg, #009939 0%, #00e65c 50%, #4dff88 100%)',
    '--gradient-dark': 'linear-gradient(180deg, #020402 0%, #000000 100%)',

    '--text-primary': '#c8ffd8',
    '--text-secondary': '#5ccf85',
    '--text-muted': '#3a8a5a',
    '--text-success': '#00ff66',
    '--text-error': '#ff5555',

    '--border-color': 'rgba(0, 255, 102, 0.18)',
    '--border-focus': 'rgba(0, 255, 102, 0.6)',
    '--shadow-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8)',
    '--shadow-glow': '0 0 20px rgba(0, 255, 102, 0.2)',
  },
};
