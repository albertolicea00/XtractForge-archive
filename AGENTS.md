# XtractForge — Agent & Developer Documentation

Technical reference for the XtractForge codebase. Start here before touching any file.

---

## Application Architecture

XtractForge runs on Electron's two-process model:

**Main Process** (`electron/main.js`)
- Full Node.js access: filesystem, child_process, IPC
- Owns the plugin registry via `electron/plugin-manager.js`
- Dispatches URL analysis and downloads to the appropriate plugin
- Persists settings to `<userData>/config.json`

**Renderer Process** (`src/`)
- React + Vite, no direct Node.js access (contextIsolation: true)
- Communicates exclusively via `window.api` (contextBridge)

**Preload Script** (`electron/preload.js`)
- Exposes a typed subset of IPC as `window.api`

---

## Plugin System

### Plugin Interface

Every plugin is a CommonJS module (`module.exports = { ... }`) with these fields:

```js
{
  // Identity
  id: string,          // unique, kebab-case (e.g. 'yt-dlp')
  name: string,        // display name
  description: string,
  type: 'downloader' | 'searcher',
  icon: string,        // emoji
  repoUrl: string,     // GitHub or project URL shown in the UI
  installHint: string, // one-line install command shown when not available

  // Settings schema rendered in Settings → [Plugin] tab
  configSchema: Array<{
    key: string,
    label: string,
    type: 'text' | 'toggle' | 'select',
    default: any,
    placeholder?: string,
    options?: string[],   // required when type === 'select'
  }>,

  // Methods (config = merged global + plugin-specific config)
  checkDependency(config): { available: boolean, version: string },
  canHandle(url): boolean,              // downloaders only
  getInfo(url, config): Promise<InfoResult>,
  buildDownloadArgs(url, options, config): { binary: string, args: string[] },
  parseProgress(line): ProgressResult | null,

  // Searchers only
  search(query, config): Promise<{ results: SearchResult[] }>,
}
```

**InfoResult shape:**
```js
{
  success: true,
  data: {
    title: string,
    thumbnail: string,
    thumbnails: Array<{ url: string }>,
    duration: number,      // seconds
    uploader: string,
    channel: string,
    view_count: number | null,
    formats: Array<{
      format_id: string,
      ext: string,
      resolution: string,
      filesize: number | null,
      filesize_approx: number | null,
      fps: number | null,
      format_note: string,
      vcodec: string,
    }>,
    _plugin: string,       // plugin id that handled this
    _isGallery?: boolean,  // gallery-dl flag
  }
}
```

**SearchResult shape (Ollama):**
```js
{ title: string, searchQuery: string, description: string, type: 'video' | 'audio' }
```

### Plugin Manager (`electron/plugin-manager.js`)

| Export | Description |
|---|---|
| `getDownloaderForUrl(url, disabledList)` | Returns the best plugin for a URL (specific before yt-dlp fallback) |
| `getPlugin(id)` | Lookup by id |
| `getAllPlugins()` | `{ downloaders, searchers }` |
| `getPluginConfig(pluginId, globalConfig)` | Merges `globalConfig.plugins[pluginId]` over `globalConfig` |
| `checkAllDependencies(globalConfig)` | Calls `checkDependency` on every registered plugin |
| `loadExternalPlugins(dir)` | Loads all `.js` files from a directory into the registry |
| `loadPluginFile(filePath)` | Loads a single `.js` file into the registry |

### Plugin Loading Order

1. Built-in plugins registered at module load time (ordered: spotdl → gallery-dl → annie → lux → yt-dlp)
2. External plugins from `<userData>/plugins/` loaded in `initPlugins()` at window creation
3. User-imported plugins via IPC `browse-plugin-file` → `loadPluginFile`

### URL Routing

`getDownloaderForUrl` iterates plugins in registry order and returns the first whose `canHandle(url)` returns true. yt-dlp's `canHandle` always returns `true` — it's the catch-all.

Disabled plugins (in `config.disabledPlugins[]`) are skipped.

---

## IPC API

All IPC is invoked via `window.api` in the renderer.

### Async Methods

| Method | Args | Returns | Description |
|---|---|---|---|
| `checkDependencies()` | — | `Promise<PluginStatusMap>` | All plugins' dep status |
| `selectFolder()` | — | `Promise<string \| null>` | Native folder picker |
| `getDefaultDownloadsFolder()` | — | `Promise<string>` | Current download dir |
| `openFolder(path)` | `path: string` | `Promise<boolean>` | Open in OS file explorer |
| `getVideoInfo(url)` | `url: string` | `Promise<{ success, data, pluginId }>` | Auto-routed media info |
| `startDownload(id, url, opts)` | — | `Promise<boolean>` | Start download process |
| `cancelDownload(id)` | `id: string` | `Promise<boolean>` | SIGTERM the process |
| `saveSettings(settings)` | `settings: object` | `Promise<boolean>` | Save global config |
| `getPluginConfigs()` | — | `Promise<object>` | Per-plugin config map |
| `savePluginConfigs(configs)` | `configs: object` | `Promise<boolean>` | Save per-plugin configs |
| `setPluginEnabled(id, enabled)` | `id: string, enabled: bool` | `Promise<boolean>` | Toggle plugin on/off |
| `importPluginFile(path)` | `path: string` | `Promise<{id, success, error}>` | Load plugin from path |
| `browsePluginFile()` | — | `Promise<{id, success, error} \| null>` | File picker + load |
| `openPluginsDir()` | — | `Promise<string>` | Open `<userData>/plugins/` |
| `ollamaSearch(query)` | `query: string` | `Promise<{results}>` | AI content discovery |

### IPC Events (push from main → renderer)

```js
window.api.onDownloadProgress(({ downloadId, percent, size, speed, eta, status }) => {})
window.api.onDownloadComplete(({ downloadId, status }) => {})
window.api.onDownloadError(({ downloadId, status, error }) => {})
```

---

## Config File (`<userData>/config.json`)

```json
{
  "ytdlpPath": "yt-dlp",
  "ffmpegPath": "ffmpeg",
  "downloadFolder": "/Users/x/Downloads",
  "speedLimit": "",
  "embedSubtitles": false,
  "sponsorBlock": false,
  "disabledPlugins": [],
  "externalPluginsDir": "<userData>/plugins",
  "plugins": {
    "annie":       { "anniePath": "annie", "annieCookie": "" },
    "lux":         { "luxPath": "lux", "luxMultiThread": false },
    "gallery-dl":  { "galleryDlPath": "gallery-dl", "galleryDlCookies": "" },
    "spotdl":      { "spotdlPath": "spotdl", "spotdlFormat": "mp3", "spotdlBitrate": "320k" },
    "ollama":      { "ollamaHost": "http://localhost:11434", "ollamaModel": "llama3" }
  }
}
```

---

## Development Workflow

```bash
pnpm install      # Install deps
pnpm dev          # Vite dev server + Electron (HMR)
pnpm build        # Production React bundle → dist/
pnpm package:mac  # Electron packager for macOS
pnpm package:win  # Windows
pnpm package:linux
pnpm package:all
```

---

## Adding a New Built-in Plugin

1. Create `electron/plugins/<name>.js` following the plugin interface above
2. `require` it in `electron/plugin-manager.js` and add it to `BUILTIN_PLUGINS` (before yt-dlp) or `BUILTIN_SEARCHERS`
3. Add the plugin's `repoUrl` and `installHint` fields
4. Test `checkDependency`, `canHandle`, `getInfo`, `buildDownloadArgs`, `parseProgress`

---

## Roadmap

- Auto-download missing binaries (yt-dlp, ffmpeg) on first run
- Plugin marketplace / registry (browse and install community plugins from a URL)
- Batch URL input (newline-separated)
- Download history persistence across restarts
- Chapter selector for YouTube videos with chapters
- Light/dark theme toggle
