# XtractForge - Agent Onboarding & Architecture Documentation

This file serves as the technical documentation of the **XtractForge** project for developers and AI agents. It explains the inner workings, data flow, and Inter-Process Communication (IPC) contracts between processes.

---

## 🏗️ Application Architecture

XtractForge is built on Electron's two-process architecture:

1. **Main Process (Node.js)**:
   - Executes `electron/main.js`.
   - Has full access to Node.js APIs (filesystem, child process spawning).
   - Manages window lifecycle and configuration storage on disk (`config.json` inside the user data directory).
   - Spawns child processes to interact with the `yt-dlp` CLI and `ffmpeg` encoder.

2. **Renderer Process (Web/React)**:
   - Compiled from `src/` via Vite and rendered in Electron's browser window.
   - Styled using a clean, dark-themed system in `src/index.css`.
   - Manages the download queue state, URL validation, and user preferences.
   - **Does not have direct Node.js access for security reasons (contextIsolation: true)**.

3. **Preload Script (Security Bridge - IPC)**:
   - Executes `electron/preload.js`.
   - Exposes a secure subset of functions to the frontend via `contextBridge.exposeInMainWorld('api', {...})`.

---

## 🔌 IPC API (Inter-Process Communication)

The frontend interacts with the operating system by calling methods exposed under `window.api`. The contracts are as follows:

### Asynchronous Methods (Invocations)

| Method Name | Arguments | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `checkDependencies()` | None | `Promise<Object>` | Returns `{ ytdlp: bool, ffmpeg: bool, ytdlpVersion: string, ffmpegVersion: string }` by running tools with `--version` and `-version`. |
| `selectFolder()` | None | `Promise<string \| null>` | Opens a native OS folder dialog. Returns the absolute path selected or `null` if cancelled. |
| `getDefaultDownloadsFolder()` | None | `Promise<string>` | Returns the default downloads folder configured in the application. |
| `getVideoInfo(url)` | `url: string` | `Promise<Object>` | Runs `yt-dlp --dump-single-json --flat-playlist <url>` and returns the parsed JSON containing metadata and formats. |
| `startDownload(downloadId, url, options)` | `downloadId: string`, `url: string`, `options: Object` | `Promise<boolean>` | Starts download asynchronously with options like format, destination folder, speed limits, SponsorBlock, and subtitles. |
| `cancelDownload(downloadId)` | `downloadId: string` | `Promise<boolean>` | Terminates the active download subprocess by sending a `SIGTERM` signal. |
| `openFolder(path)` | `path: string` | `Promise<boolean>` | Opens the specified path in the OS native file explorer (Finder, Windows Explorer, etc.). |

### System Events (Listeners)

The frontend can register callbacks to listen to real-time download events:

```javascript
// Returns an unsubscribe function to prevent memory leaks
const unsubscribe = window.api.onDownloadProgress((data) => {
  // data: { downloadId, percent, size, speed, eta, status }
});
```

---

## ⚙️ Integration with `yt-dlp`

### 1. Metadata Extraction
To retrieve details about a video quickly without downloading it, the main process runs:
```bash
yt-dlp --dump-single-json --flat-playlist "VIDEO_URL"
```
This returns a comprehensive JSON on `stdout` containing the list of available formats, thumbnail, title, author, and duration.

### 2. Download & Formats Merging
The download process is handled by spawning `yt-dlp` with customized parameters:
- **Standard Video Download**: `-f "bestvideo+bestaudio/best"` or resolution-capped `-f "bestvideo[height<=1080]+bestaudio/best"`.
- **Audio Extraction**: `-x --audio-format mp3` (or other formats like `m4a`, `wav`).
- **Filenames**: Saved using the template `-o "/download/path/%(title)s.%(ext)s"`.
- **Subtitles**: Enabled with `--embed-subs --all-subs`.
- **SponsorBlock**: Patrons/sponsors skipped using `--sponsorblock-remove all`.

### 3. Progress Regex
The `stdout` of `yt-dlp` is processed line-by-line using the following regex to extract percentage, size, speed, and ETA:
```javascript
const progressRegex = /\[download\]\s+([\d.]+)% of\s+(?:~\s*)?([\d.]+\w+) at\s+([\d.]+\w+\/s) ETA\s+([\d:]+)/;
```

---

## 🚀 Development Workflow & Makefile

A `Makefile` in the root folder provides quick shortcuts:

- **Install**: `make install` (Installs dependencies declared in `package.json`).
- **Dev mode**: `make dev` (Starts Vite dev server in the background and opens the Electron window with HMR).
- **Build**: `make build` (Generates production-ready static assets in `dist/`).
- **Packaging**:
  - `make package-mac`
  - `make package-win`
  - `make package-linux`
  - `make package-all`
- **Clean**: `make clean` (Clears build directories and `node_modules` for a clean install).
- **Git Commit**: `make git-commit` (Stages all files and performs initial git commit).

---

## 🗺️ Future Roadmap for Agents

If you decide to continue extending the application, here are recommended focus areas:

1. **Auto-download Binaries**: Fetch `yt-dlp` and `ffmpeg` binaries automatically if they are missing on the host system to ensure zero-config onboarding.
2. **Batch Downloads**: Allow pasting a list of URLs (newline-separated) to add multiple items to the queue at once.
3. **History Persistence**: Store the list of finished downloads in `config.json` so the history remains visible across application restarts.
4. **Visual Chapter Selector**: For YouTube videos with chapters, let the user select specific chapters to download (using `yt-dlp`'s `--split-chapters` option).
5. **Adaptive UI Theme**: Toggle light/dark mode based on the user's OS preference.
