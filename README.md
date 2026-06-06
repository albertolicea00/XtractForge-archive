# XtractForge

A modern, cross-platform desktop GUI for downloading media from 1000+ sites — built on **Electron + React + Vite** with a **plugin architecture** that lets you add, enable, disable, and import community-built downloaders.

## Built-in Plugins

| Plugin | Type | Sites | Repo |
|---|---|---|---|
| **yt-dlp** | Downloader | YouTube, Vimeo, Twitter/X, TikTok, 1000+ | [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| **Annie** | Downloader | Bilibili, Youku, iQiyi, Weibo, Douyin | [github.com/iawia002/annie](https://github.com/iawia002/annie) |
| **Lux** | Downloader | Bilibili, Douyin, Kuaishou + Annie's sites | [github.com/iawia002/lux](https://github.com/iawia002/lux) |
| **gallery-dl** | Downloader | DeviantArt, Pixiv, Reddit, Instagram, Danbooru, 200+ | [github.com/mikf/gallery-dl](https://github.com/mikf/gallery-dl) |
| **spotDL** | Downloader | Spotify tracks, albums, playlists | [github.com/spotDL/spotify-downloader](https://github.com/spotDL/spotify-downloader) |
| **Ollama AI** | Searcher | Local AI content discovery | [github.com/ollama/ollama](https://github.com/ollama/ollama) |

XtractForge auto-detects which plugin to use based on the URL. yt-dlp is the fallback for anything not handled by a more specific plugin.

## Features

- **Plugin system** — enable/disable any plugin; import community plugins as `.js` files
- **AI Discover tab** — describe what you want; Ollama suggests search queries to download
- **URL auto-detection** — routes each URL to the right plugin automatically
- **Download queue** — real-time progress, speed, ETA, cancel
- **Format selection** — video quality presets, audio-only, or raw format picker
- **Per-plugin settings** — binary paths, cookies, bitrate, AI model name, etc.
- **Dark UI** — glassmorphic dark theme

## Prerequisites

Install Node.js 16+ and pnpm. Then install whichever download tools you need:

```bash
# yt-dlp + ffmpeg (required for most video sites)
pip install yt-dlp
brew install ffmpeg

# gallery-dl (image galleries)
pip install gallery-dl

# spotDL (Spotify)
pip install spotdl

# Annie / Lux (Asian platforms)
brew install annie
brew install lux

# Ollama (AI discovery)
# Download from https://ollama.com then:
ollama pull llama3
```

You only need the tools you plan to use. Missing tools are shown in the Plugins tab with install hints.

## Getting Started

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm package:mac
pnpm package:win
pnpm package:linux
pnpm package:all
```

Packages are saved to `dist-package/`.

## Writing a Plugin

A plugin is a single `.js` file. Drop it in the **Plugins Folder** (accessible from the Plugins tab) or use **Import Plugin**.

```js
module.exports = {
  id: 'my-tool',
  name: 'My Tool',
  description: 'Downloads from example.com',
  type: 'downloader',       // 'downloader' | 'searcher'
  icon: '🔧',
  repoUrl: 'https://github.com/org/my-tool',
  installHint: 'pip install my-tool',

  configSchema: [
    { key: 'myToolPath', label: 'Binary path', type: 'text', default: 'my-tool', placeholder: '/usr/local/bin/my-tool' },
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

See [electron/plugins/ytdlp.js](electron/plugins/ytdlp.js) for a complete reference implementation.

## Architecture

```
electron/
  main.js              Main process — IPC handlers, plugin dispatch
  preload.js           Secure IPC bridge (contextBridge)
  plugin-manager.js    Plugin registry, URL routing, dependency checks, external loading
  plugins/
    ytdlp.js           yt-dlp plugin
    annie.js           Annie plugin
    lux.js             Lux plugin
    gallery-dl.js      gallery-dl plugin
    spotdl.js          spotDL plugin
    ollama.js          Ollama AI searcher
src/
  App.jsx              React UI — Download, Queue, AI Discover, Plugins, Settings
  index.css            Dark theme
```

External plugins live in `<userData>/plugins/` and are loaded automatically on startup.
