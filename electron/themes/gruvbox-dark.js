// Gruvbox Dark — retro warm earth tones with orange/aqua accents.
module.exports = {
  id: 'gruvbox-dark',
  name: 'Gruvbox Dark',
  description: 'Retro warm earth, orange accent',
  author: 'XtractForge',
  repoUrl: '',
  mode: 'dark',
  swatches: ['#fe8019', '#8ec07c', '#282828'],

  variables: {
    '--font-sans': "'SFMono-Regular', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
    '--bg-deep': '#1d2021',
    '--bg-dark': '#282828',
    '--bg-card': 'rgba(40, 40, 40, 0.7)',
    '--bg-panel': 'rgba(29, 32, 33, 0.92)',
    '--bg-input': 'rgba(80, 73, 69, 0.35)',
    '--bg-hover': 'rgba(235, 219, 178, 0.05)',

    '--primary': '#fe8019',
    '--primary-glow': 'rgba(254, 128, 25, 0.3)',
    '--accent': '#8ec07c',
    '--accent-glow': 'rgba(142, 192, 124, 0.3)',

    '--gradient-primary': 'linear-gradient(135deg, #fe8019 0%, #8ec07c 100%)',
    '--gradient-hover': 'linear-gradient(135deg, #e6720f 0%, #7fb06d 100%)',
    '--gradient-dark': 'linear-gradient(180deg, #282828 0%, #1d2021 100%)',

    '--text-primary': '#ebdbb2',
    '--text-secondary': '#bdae93',
    '--text-muted': '#928374',
    '--text-success': '#b8bb26',
    '--text-error': '#fb4934',

    '--border-color': 'rgba(235, 219, 178, 0.1)',
    '--border-focus': 'rgba(254, 128, 25, 0.5)',
    '--shadow-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.55), 0 8px 10px -6px rgba(0, 0, 0, 0.55)',
    '--shadow-glow': '0 0 20px rgba(254, 128, 25, 0.18)',
  },
};
