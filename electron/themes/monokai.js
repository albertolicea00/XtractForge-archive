// Monokai — vibrant high-contrast dark with green/pink accents.
module.exports = {
  id: 'monokai',
  name: 'Monokai',
  description: 'Vibrant high-contrast dark',
  author: 'XtractForge',
  repoUrl: '',
  mode: 'dark',
  swatches: ['#a6e22e', '#f92672', '#272822'],

  variables: {
    '--font-sans': "'SFMono-Regular', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
    '--bg-deep': '#1e1f1c',
    '--bg-dark': '#272822',
    '--bg-card': 'rgba(39, 40, 34, 0.7)',
    '--bg-panel': 'rgba(30, 31, 28, 0.92)',
    '--bg-input': 'rgba(73, 72, 62, 0.4)',
    '--bg-hover': 'rgba(248, 248, 242, 0.05)',

    '--primary': '#a6e22e',
    '--primary-glow': 'rgba(166, 226, 46, 0.3)',
    '--accent': '#f92672',
    '--accent-glow': 'rgba(249, 38, 114, 0.3)',

    '--gradient-primary': 'linear-gradient(135deg, #a6e22e 0%, #f92672 100%)',
    '--gradient-hover': 'linear-gradient(135deg, #95d21e 0%, #e91662 100%)',
    '--gradient-dark': 'linear-gradient(180deg, #272822 0%, #1e1f1c 100%)',

    '--text-primary': '#f8f8f2',
    '--text-secondary': '#cfcfc2',
    '--text-muted': '#75715e',
    '--text-success': '#a6e22e',
    '--text-error': '#f92672',

    '--border-color': 'rgba(248, 248, 242, 0.09)',
    '--border-focus': 'rgba(166, 226, 46, 0.5)',
    '--shadow-lg': '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
    '--shadow-glow': '0 0 20px rgba(166, 226, 46, 0.18)',
  },
};
