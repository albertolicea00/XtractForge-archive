# XtractForge

<div align="center">

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-16+-339933?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

**[⏬ Downloads](#️-download) · [🧩 Plugins & Addons](ADDONS.md) · [🤝 Contributing](CONTRIBUTING.md) · [🐛 Report a Bug](https://github.com/albertolicea00/XtractForge/issues/new?template=bug_report.yml) · [💡 Request a Feature](https://github.com/albertolicea00/XtractForge/issues/new?template=feature_request.yml)**

</div>

---

**XtractForge** is a modern, open-source, cross-platform desktop app for downloading media from anywhere — YouTube, Spotify, Bilibili, DeviantArt, image galleries, and 1000+ more sites. Built on **Electron + React + Vite** with a **plugin architecture**: every downloader is a hot-swappable plugin. Enable what you need, disable what you don't, and import community-built plugins with one click.

---

## ✨ Features

| | |
|---|---|
| 🔌 **Plugin system** | Enable/disable any tool; import community plugins as plain `.js` files |
| 🎯 **Auto-detection** | Paste any URL; XtractForge picks the right plugin automatically (or force one) |
| 📊 **Download queue** | Live progress, speed, ETA, pause/resume, reorder, expandable console output |
| ↩️ **Resumable** | Downloads stage in a temp folder so interrupted yt-dlp/curl transfers resume |
| 🗂️ **Organize output** | Keep files flat, or sort into folders by type or source; playlists nest automatically |
| 🎞️ **Format picker** | Quality presets, audio-only (MP3/M4A/WAV), or raw format selection |
| ⚙️ **Per-plugin config** | Binary paths, cookies, bitrate — each plugin has its own settings page |
| 🎨 **Themes** | Switch visual modes, override accent color, tune glass/typography; import community themes as `.js` files |
| 🌍 **i18n** | English & Spanish UI (one file per language) |
| 🌑 **Glassmorphic UI** | Native macOS/Windows/Linux window chrome, light & dark built-in themes |

---

## 🧩 Built-in Plugins

XtractForge ships with these plugins out of the box:

| Plugin | Supported Sites |
|---|---|
| 🎥 **yt-dlp** | YouTube, Vimeo, Twitter/X, TikTok, Twitch, SoundCloud, 1000+ |
| 🐉 **Lux** | Bilibili, Douyin, Kuaishou, Weibo, and more |
| 🖼️ **gallery-dl** | DeviantArt, Pixiv, Reddit, Instagram, Danbooru, 200+ image galleries |
| 🎵 **spotDL** | Spotify tracks, albums, and playlists (via YouTube Music) |
| 🎞️ **FFmpeg** | HLS (m3u8), DASH (mpd), and RTMP/RTSP live streams |
| 🔗 **curl** | Direct file URLs (saved as-is) |

→ Full list, install instructions, and community plugin directory: **[ADDONS.md](ADDONS.md)**

---

## ⬇️ Download

<div style="border-left: 4px solid #f39c12; padding: 8px 12px;">
<strong>⚠️ Beta Notice:</strong>
The current version is still in beta.<br>
Package manager distributions will be published once they are ready.<br>
Please avoid using <b>brew</b>, <b>choco</b>, <b>winget</b> or <b>snap</b> for now.
</div>

### 🍎 macOS

```bash
# Homebrew (recommended)
brew install --cask xtractforge
```

or **[⬇️ Download the latest release](https://github.com/albertolicea00/XtractForge/releases/latest)** — then grab:
- `XtractForge-<version>-arm64.dmg` — Apple Silicon (M1/M2/M3…)
- `XtractForge-<version>.dmg` — Intel

> Requires macOS 11 (Big Sur) or later. Apple Silicon and Intel supported.

---

### 🪟 Windows

```powershell
# winget
winget install albertolicea00.XtractForge

# Chocolatey
choco install xtractforge
```

or **[⬇️ Download the latest release](https://github.com/albertolicea00/XtractForge/releases/latest)** — then grab:
- `XtractForge-Setup-<version>.exe` — installer
- `XtractForge-<version>-win.zip` — portable

> Requires Windows 10 or later (64-bit).

---

### 🐧 Linux

```bash
# Snap
snap install xtractforge

# AUR (Arch Linux)
yay -S xtractforge

# wget — AppImage (no install needed)
wget https://github.com/albertolicea00/XtractForge/releases/latest/download/XtractForge-linux.AppImage
chmod +x XtractForge-linux.AppImage
./XtractForge-linux.AppImage
```

or **[⬇️ Download the latest release](https://github.com/albertolicea00/XtractForge/releases/latest)** — then grab:
- `XtractForge-<version>.AppImage` — portable (chmod +x, then run)
- `xtractforge_<version>_amd64.deb` — Debian/Ubuntu

> Tested on Ubuntu 22.04+, Fedora 38+, Arch Linux.

---

📋 [All releases & changelogs](https://github.com/albertolicea00/XtractForge/releases) · 🔧 [Build from source → CONTRIBUTING.md](CONTRIBUTING.md)

After installing, grab the download tools you need from **[ADDONS.md](ADDONS.md)**.

---

## 🚀 How to Use

1. 🔗 **Paste a URL** in the Download tab — XtractForge picks the right plugin automatically
2. 🎛️ **Choose quality** — video preset, audio-only, or pick a raw format
3. ⬇️ **Click Download** — progress appears live in the Queue tab
4. 🔌 **Manage plugins** — enable, disable, or import new plugins from the Plugins tab

> 💡 Missing a tool? The Plugins tab shows which tools aren't installed, with one-line install commands.

---

## 🧩 Plugins & Community Addons

XtractForge's plugin system lets anyone build and share a downloader. A plugin is a single `.js` file — no framework, no bundler, just plain CommonJS.

→ **[ADDONS.md](ADDONS.md)** — built-in plugin details, community plugin list, install guide, and full plugin API reference

---

## 🤝 Contributing

Contributions of all kinds are welcome — bug fixes, new plugins, UI improvements, documentation, testing on different platforms.

→ **[CONTRIBUTING.md](CONTRIBUTING.md)** — dev setup, project structure, plugin authoring guide, PR checklist

- 🐛 [Report a bug](https://github.com/albertolicea00/XtractForge/issues/new?template=bug_report.yml)
- 💡 [Request a feature](https://github.com/albertolicea00/XtractForge/issues/new?template=feature_request.yml)
- 🧩 [Submit a plugin](https://github.com/albertolicea00/XtractForge/issues/new?template=plugin_submission.yml)

---

## 🏗️ Architecture

```
electron/
  main.js              Main process — IPC handlers, plugin dispatch, settings
  preload.js           Secure IPC bridge (contextBridge)
  plugin-manager.js    Plugin registry, URL routing, dependency checks, external loading
  theme-manager.js     Theme registry + external theme loading
  plugins/             Built-in plugins (one self-contained .js file each)
  themes/              Built-in themes (one .js file each)
src/
  App.jsx              React UI — Download, Queue, Plugins, Themes, Settings tabs
  lib/                 Pure helpers (format, theme, plugins, queue)
  locales/             i18n strings, one file per language
  index.css            Theme variables + base styles
tests/                 Vitest suite (lib, plugins, managers)
```

→ Full IPC contracts, data flows, and plugin internals: **[AGENTS.md](AGENTS.md)**

---

## 🧪 Tests

```bash
pnpm test            # run the suite once
pnpm test:watch      # re-run on every change
```

Fast Node-side tests (Vitest) cover the pure logic: helpers, every built-in plugin's
routing/parsing/arg-building, and the plugin/theme managers. Run them before pushing.
See **[CONTRIBUTING.md](CONTRIBUTING.md)** for details.

---

## ⚖️ License & Legal

XtractForge is released under the **[MIT License](LICENSE)**.

By using this software you agree to the **[EULA](EULA.md)**. You are solely responsible for using it in compliance with applicable law and the terms of service of any site you access. The developers do not endorse piracy or copyright infringement.

Third-party tools (yt-dlp, ffmpeg, Lux, gallery-dl, spotDL) are not bundled and governed by their own licenses.

🔐 Security vulnerabilities → **[SECURITY.md](SECURITY.md)**
