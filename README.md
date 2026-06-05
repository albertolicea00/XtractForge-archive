# XtractForge - yt-dlp GUI

A premium, modern, cross-platform desktop graphical user interface (GUI) for the powerful video download engine `yt-dlp`. Built using **Electron**, **React**, and **Vite**.

## Features

- 🎨 **Modern Interface**: Premium dark-mode aesthetics featuring sleek glassmorphic panels and glow effects.
- ⚙️ **Automatic Detection**: Real-time checking of the installation status of `yt-dlp` and `ffmpeg` in your environment.
- 🔍 **URL Analyzer**: Easily resolves metadata (title, author, thumbnail, duration) before initiating a download.
- 🖥️ **Quality Selection**: Select from video resolution presets (4K / 1080p / 720p), audio-only downloads (MP3 / M4A / WAV), or granular formats extracted from metadata.
- 📊 **Download Queue**: Displays real-time download status, percentages, speed limits, and Estimated Time of Arrival (ETA).
- 📁 **Folder Management**: Select custom destinations and access folder contents instantly.
- ⚙️ **Advanced Settings**: Configure custom speed limits, subtitle embedding, SponsorBlock integration, and custom binary paths for both `yt-dlp` and `ffmpeg`.

## Prerequisites

Ensure you have the following components installed on your machine:

1. [Node.js](https://nodejs.org/) (Version 16 or newer)
2. [yt-dlp](https://github.com/yt-dlp/yt-dlp)
3. [ffmpeg](https://ffmpeg.org/) (required to merge high-quality audio and video formats)

## Getting Started

### 1. Install Dependencies

From the project root directory, run:

```bash
npm install
```

### 2. Run in Development Mode

To start the Vite development server with Hot Module Replacement (HMR) and open the Electron wrapper concurrently:

```bash
npm run dev
```

### 3. Build & Package

To compile the React bundle and package the application into a standalone desktop installer for your OS:

#### macOS:
```bash
npm run package:mac
```

#### Windows:
```bash
npm run package:win
```

#### Linux:
```bash
npm run package:linux
```

All generated distribution packages are saved in the `dist-package/` directory.

## Codebase Architecture

- `electron/main.js`: Main process entry point. Handles Electron's lifecycle, settings file persistence, system actions, and spawns the `yt-dlp` sub-processes.
- `electron/preload.js`: Secure IPC bridge separating Node.js capabilities from the browser view.
- `src/`: React frontend directory.
  - `src/App.jsx`: Core application component managing state transitions, tabs, and event handlers.
  - `src/index.css`: Styling sheets implementing the custom dark-theme system, animations, and typography tokens.
