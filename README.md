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
| 🎯 **Auto-detection** | Paste any URL; XtractForge picks the right plugin automatically |
| 📊 **Download queue** | Real-time progress, speed, ETA, concurrent downloads, cancel |
| 🎞️ **Format picker** | Quality presets, audio-only (MP3/M4A/WAV), or raw format selection |
| ⚙️ **Per-plugin config** | Binary paths, cookies, bitrate — all configurable in Settings |
| 🎨 **Themes** | Switch visual modes, override accent color, tune glass intensity; import community themes as `.js` files |
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

→ Full list, install instructions, and community plugin directory: **[ADDONS.md](ADDONS.md)**

---

## ⬇️ Download

### 🍎 macOS

```bash
# Homebrew (recommended)
brew install --cask xtractforge
```

Or download directly:
[**📦 XtractForge-mac.dmg**](https://github.com/albertolicea00/XtractForge/releases/latest/download/XtractForge-mac.dmg) · [🗜️ XtractForge-mac.zip](https://github.com/albertolicea00/XtractForge/releases/latest/download/XtractForge-mac.zip)

> Requires macOS 11 (Big Sur) or later. Apple Silicon and Intel supported.

---

### 🪟 Windows

```powershell
# winget
winget install albertolicea00.XtractForge

# Chocolatey
choco install xtractforge
```

Or download directly:
[**📦 XtractForge-win-setup.exe**](https://github.com/albertolicea00/XtractForge/releases/latest/download/XtractForge-win-setup.exe) · [🗜️ XtractForge-win-portable.zip](https://github.com/albertolicea00/XtractForge/releases/latest/download/XtractForge-win-portable.zip)

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

Or download directly:
[**📦 XtractForge-linux.AppImage**](https://github.com/albertolicea00/XtractForge/releases/latest/download/XtractForge-linux.AppImage) · [📦 XtractForge-linux.deb](https://github.com/albertolicea00/XtractForge/releases/latest/download/XtractForge-linux.deb)

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
  plugins/             Built-in plugins (one self-contained .js file each)
src/
  App.jsx              React UI — Download, Queue, AI Discover, Plugins, Settings tabs
  index.css            Dark theme
```

→ Full IPC contracts, data flows, and plugin internals: **[AGENTS.md](AGENTS.md)**

---

## ⚖️ License & Legal

XtractForge is released under the **[MIT License](LICENSE)**.

By using this software you agree to the **[EULA](EULA.md)**. You are solely responsible for using it in compliance with applicable law and the terms of service of any site you access. The developers do not endorse piracy or copyright infringement.

Third-party tools (yt-dlp, ffmpeg, Lux, gallery-dl, spotDL) are not bundled and governed by their own licenses.

🔐 Security vulnerabilities → **[SECURITY.md](SECURITY.md)**
