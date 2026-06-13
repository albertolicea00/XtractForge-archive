// Alexandria — scholarly light editorial. Paper-white surfaces, warm gold accent.
module.exports = {
  id: 'alexandria',
  name: 'Alexandria',
  description: 'Scholarly light editorial',
  author: 'XtractForge',
  repoUrl: '',
  mode: 'light',
  swatches: ['#b08d57', '#3a3a3a', '#f4f1ea'],

  variables: {
    '--bg-deep': '#ece7dd',
    '--bg-dark': '#f4f1ea',
    '--bg-card': 'rgba(255, 253, 248, 0.85)',
    '--bg-panel': 'rgba(248, 245, 238, 0.95)',
    '--bg-input': 'rgba(0, 0, 0, 0.03)',
    '--bg-hover': 'rgba(0, 0, 0, 0.04)',

    '--primary': '#b08d57',
    '--primary-glow': 'rgba(176, 141, 87, 0.25)',
    '--accent': '#8a6d3b',
    '--accent-glow': 'rgba(138, 109, 59, 0.2)',

    '--gradient-primary': 'linear-gradient(135deg, #c9a366 0%, #b08d57 50%, #8a6d3b 100%)',
    '--gradient-hover': 'linear-gradient(135deg, #b8945c 0%, #9c7d4d 50%, #75592f 100%)',
    '--gradient-dark': 'linear-gradient(180deg, #f4f1ea 0%, #ece7dd 100%)',

    '--text-primary': '#2a2620',
    '--text-secondary': '#5c554a',
    '--text-muted': '#8a8275',
    '--text-success': '#3f7d4f',
    '--text-error': '#b23b3b',

    '--border-color': 'rgba(0, 0, 0, 0.1)',
    '--border-focus': 'rgba(176, 141, 87, 0.6)',
    '--shadow-lg': '0 10px 25px -5px rgba(80, 70, 50, 0.15), 0 8px 10px -6px rgba(80, 70, 50, 0.1)',
    '--shadow-glow': '0 0 20px rgba(176, 141, 87, 0.12)',
  },
};
