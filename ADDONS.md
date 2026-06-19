# XtractForge — Addons

XtractForge uses a plugin system to route URLs to the right downloader. Built-in plugins ship with the app; external plugins are `.js` files you drop in or import.

---

## Built-in Plugins

These ship with every XtractForge install. Enable or disable them from the **Plugins** tab.

| Plugin | Type | Supported Sites | Repo |
|---|---|---|---|
| ![yt-dlp](https://img.shields.io/badge/yt--dlp-downloader-FF0000?logo=youtube&logoColor=white) | Downloader | YouTube, Vimeo, Twitter/X, TikTok, Twitch, SoundCloud, 1000+ | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| ![Lux](https://img.shields.io/badge/Lux-downloader-blueviolet) | Downloader | Bilibili, Douyin, Kuaishou, Weibo, and more | [iawia002/lux](https://github.com/iawia002/lux) |
| ![gallery-dl](https://img.shields.io/badge/gallery--dl-downloader-blue) | Downloader | DeviantArt, Pixiv, Reddit, Instagram, Danbooru, 200+ image galleries | [mikf/gallery-dl](https://github.com/mikf/gallery-dl) |
| ![spotDL](https://img.shields.io/badge/spotDL-downloader-1DB954?logo=spotify&logoColor=white) | Downloader | Spotify tracks, albums, playlists (via YouTube Music) | [spotDL/spotify-downloader](https://github.com/spotDL/spotify-downloader) |

XtractForge auto-detects which plugin to use based on the URL. **yt-dlp is the fallback** for anything not handled by a more specific plugin.

### Install Built-in Dependencies

```bash
# yt-dlp + ffmpeg — required for most video sites
pip install yt-dlp
brew install ffmpeg        # macOS
# Windows: choco install ffmpeg

# gallery-dl — image galleries
pip install gallery-dl

# spotDL — Spotify
pip install spotdl

# Lux — Asian platforms
brew install lux
```

Missing tools are shown in the Plugins tab with install hints — you only need what you plan to use.

---

## External / Community Plugins

Community plugins are single `.js` files following the XtractForge plugin API.

### How to install

**Option A — Plugin Folder**
Drop the `.js` file into the plugins folder. Open it from the **Plugins tab → Open Plugins Folder**. Restart or hit **Reload Plugins**.

**Option B — Import**
Click **Import Plugin** in the Plugins tab and select the `.js` file.

External plugins live in `<userData>/plugins/` and are loaded automatically on startup.

### Community plugins

> This list is community-maintained. Open a PR to add your plugin.

| Plugin | Type | Sites | Install |
|---|---|---|---|
| *(none yet — be the first!)* | — | — | — |

---

## Writing a Plugin

A plugin is a single `.js` file with a `module.exports` object:

```js
module.exports = {
  id: 'my-tool',
  name: 'My Tool',
  description: 'Downloads from example.com',
  type: 'downloader',
  icon: '🔧',
  repoUrl: 'https://github.com/org/my-tool',
  installHint: 'pip install my-tool',         // fallback shown when not installed
  install: {                                  // optional: per-OS command, picked automatically
    darwin: 'brew install my-tool',
    win32: 'winget install my-tool',
    linux: 'pipx install my-tool',
    default: 'pip install my-tool',
  },

  configSchema: [
    { key: 'myToolPath', label: 'Binary path', type: 'text',   default: 'my-tool', placeholder: '/usr/local/bin/my-tool' },
    { key: 'myFlag',     label: 'Enable X',    type: 'toggle', default: false },
    { key: 'myFormat',   label: 'Format',      type: 'select', default: 'mp4', options: ['mp4', 'mkv'] },
  ],

  checkDependency(config) {
    // Return { available: bool, version: string }
  },

  canHandle(url) {
    return url.includes('example.com');
  },

  async getInfo(url, config) {
    // Return { success: true, data: { title, thumbnail, thumbnails, duration, uploader, formats, _plugin } }
  },

  buildDownloadArgs(url, options, config) {
    // Return { binary: string, args: string[] }
  },

  parseProgress(line) {
    // Return { percent, speed, eta, size } or null
  },
};
```

See [src/plugins/ytdlp.ts](src/plugins/ytdlp.ts) for a full reference implementation.

---

## Themes

Themes are installed exactly like plugins — single `.js` files dropped in the themes folder or imported from the **Themes tab**. A theme is pure data (CSS variables), so nothing executes from it.

### Built-in Themes

| Theme | Mode | Look |
|---|---|---|
| 🟣 **Cyber-Glass** (default) | Dark | Glassmorphic dark utility, violet accents |
| 📜 **Alexandria** | Light | Scholarly light editorial, warm gold accent |
| 🟢 **Matrix** | Dark | High-contrast terminal, phosphor green, mono font |
| 🧛 **Dracula** | Dark | Iconic deep slate with purple & pink |
| ❄️ **Nord** | Dark | Arctic north-bluish frost palette |
| ☀️ **Solarized Light** | Light | Warm cream surfaces with blue/cyan accents |

From the Themes tab you can also override the accent color, tune glass intensity, and toggle a monospace UI font — these layer on top of any theme.

### Writing a Theme

```js
module.exports = {
  id: 'my-theme',
  name: 'My Theme',
  description: 'A short tagline',
  author: 'you',
  mode: 'dark',                          // 'dark' | 'light'
  swatches: ['#8b5cf6', '#d946ef', '#16161d'],  // 3 preview dots
 
  // CSS custom properties applied to :root (see src/index.css for the full list)
  variables: {
    '--primary': '#8b5cf6',
    '--bg-deep': '#08080a',
    '--bg-card': 'rgba(22, 22, 29, 0.7)',
    '--text-primary': '#f8fafc',
    // ...
  },

  css: '',  // optional raw CSS appended after the :root block
};
```

Install: drop it in the Themes Folder (**Themes tab → Themes Folder**) or click **Import Theme**. See [src/themes/os-macos-dark.ts](src/themes/os-macos-dark.ts) for a full reference.
