// Catppuccin Latte — soft pastel light with mauve/blue accents.
module.exports = {
  id: 'catppuccin-latte',
  name: 'Catppuccin Latte',
  description: 'Soft pastel light, mauve accent',
  author: 'XtractForge',
  repoUrl: '',
  mode: 'light',
  swatches: ['#8839ef', '#1e66f5', '#eff1f5'],

  variables: {
    '--bg-deep': '#e6e9ef',
    '--bg-dark': '#eff1f5',
    '--bg-card': 'rgba(239, 241, 245, 0.85)',
    '--bg-panel': 'rgba(230, 233, 239, 0.95)',
    '--bg-input': 'rgba(76, 79, 105, 0.06)',
    '--bg-hover': 'rgba(76, 79, 105, 0.06)',

    '--primary': '#8839ef',
    '--primary-glow': 'rgba(136, 57, 239, 0.22)',
    '--accent': '#1e66f5',
    '--accent-glow': 'rgba(30, 102, 245, 0.2)',

    '--gradient-primary': 'linear-gradient(135deg, #8839ef 0%, #1e66f5 100%)',
    '--gradient-hover': 'linear-gradient(135deg, #7829df 0%, #1456e5 100%)',
    '--gradient-dark': 'linear-gradient(180deg, #eff1f5 0%, #e6e9ef 100%)',

    '--text-primary': '#4c4f69',
    '--text-secondary': '#6c6f85',
    '--text-muted': '#9ca0b0',
    '--text-success': '#40a02b',
    '--text-error': '#d20f39',

    '--border-color': 'rgba(76, 79, 105, 0.16)',
    '--border-focus': 'rgba(136, 57, 239, 0.55)',
    '--shadow-lg': '0 10px 25px -5px rgba(76, 79, 105, 0.15), 0 8px 10px -6px rgba(76, 79, 105, 0.1)',
    '--shadow-glow': '0 0 20px rgba(136, 57, 239, 0.12)',
  },
};
