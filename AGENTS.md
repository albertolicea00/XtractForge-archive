# XtractForge — Agent & Developer Documentation

Technical reference for the XtractForge codebase. Start here before touching any file.

---

## Application Architecture

XtractForge runs on Tauri's multi-process model:

**Core Process (Rust)** (`src-tauri/`)
- Full native system access (filesystem, process execution, dialogs).
- Implements Tauri commands in `src-tauri/src/commands.rs` (file operations, settings persistence, system command execution) and `src-tauri/src/downloader.rs` (downloads state management and child process execution/lifecycle).
- Persists settings to `config.json` in the OS-specific application data directory.

**WebView Process** (`src/`)
- Runs the React UI inside a secure native webview.
- Layout:
  - `App.jsx` — shell: owns state/handlers/effects, renders `Sidebar` + the active tab.
  - `components/ErrorBoundary.jsx` — wraps `App` in `main.jsx`; catches render errors so one broken view doesn't blank the app.
  - `components/Sidebar.jsx`, `components/tabs/*Tab.jsx` — presentational; receive state + handlers as props.
  - `lib/` — pure, framework-free helpers (`format.js`, `theme.js`, `queue.js`), TypeScript core modules (`tauri-bridge.ts`, `plugin-loader.ts`).
  - `i18n.js` + `locales/<lang>.js` — translations (English fallback).

**Tauri Bridge** (`src/lib/tauri-bridge.ts`)
- Initialized in the frontend, exposes a typed `window.api` bridge to coordinate with Rust Tauri commands and handle event listeners.

**Tests** (`tests/`, Vitest)
- Frontend unit tests for helpers in `src/lib/`, every built-in plugin (`canHandle`/`parseProgress`/`buildDownloadArgs`/schema), and the frontend `plugin-loader` (mocking the sandboxed JS/CJS loader).
- `pnpm test` (once) · `pnpm test:watch` (on change)

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
  installHint: string, // generic one-line install command (fallback)
  install?: {          // optional per-OS install commands; UI picks by process.platform
    darwin?: string,
    win32?: string,
    linux?: string,
    default?: string,  // used when the current platform has no entry
  },

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

**Plugin-driven Download view:** `getInfo` may return `data._downloadOptions` — a
declarative field schema (`[{ key, label, type: 'text'|'toggle'|'select', default,
options?, placeholder?, help? }]`). The renderer renders these in the Download tab
and passes the chosen values back to `buildDownloadArgs` as `options.pluginOptions`.
Return `data._simpleDownload: true` for a no-options direct download. This keeps each
plugin's download UI declared by the plugin itself (no UI code crosses the bridge).

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

**SearchResult shape:**
```js
{ title: string, searchQuery: string, description: string, type: 'video' | 'audio' }
```

### Plugin Manager (`src/lib/plugin-loader.ts`)

| Export / Method | Description |
|---|---|
| `getDownloaderForUrl(url, disabledList)` | Returns the best plugin for a URL (specific before yt-dlp fallback) |
| `getPlugin(id)` | Lookup by id |
| `getAllPlugins()` | `{ downloaders, searchers }` |
| `getPluginConfig(pluginId, globalConfig)` | Merges `globalConfig.plugins[pluginId]` over `globalConfig` |
| `checkAllDependencies(globalConfig)` | Calls `checkDependency` on every registered plugin (asynchronously executing binaries via Tauri command `exec_command`) |
| `loadExternalPlugins(dir)` | Reads all `.js` files from directory using Tauri `read_external_files` and loads them into registry |
| `loadPluginFile(filename, content)` | Compiles and loads a plugin into the registry via sandboxed CommonJS mock evaluator |

### Plugin Loading Order

1. Built-in plugins registered at module load time. Routing order (most specific
   first, yt-dlp catch-all last): spotdl → gallery-dl → lux → ffmpeg → curl → yt-dlp.
   Plugin-card display order is independent — driven by each plugin's `order` field.
2. External plugins from `<appDataDir>/plugins/` loaded in `initTauriBridge()` at application startup
3. User-imported plugins via Tauri invocation `browsePluginFile` -> `loadPluginFile`

### URL Routing

`getDownloaderForUrl` iterates plugins in registry order and returns the first whose `canHandle(url)` returns true. yt-dlp's `canHandle` always returns `true` — it's the catch-all.

Disabled plugins (in `config.disabledPlugins[]`) are skipped.

---

## Theme System

Themes mirror the plugin model: built-in themes ship with the app, community themes are importable `.js` files. A theme is pure data — CSS custom properties — so no logic runs from a theme file.

### Theme Interface

Every theme is a CommonJS module (`module.exports = { ... }`):

```js
{
  id: string,            // unique, kebab-case (e.g. 'cyber-glass')
  name: string,          // display name
  description: string,
  author: string,        // shown as a badge for community themes
  repoUrl: string,       // optional
  mode: 'dark' | 'light',
  swatches: string[],    // 3 preview dots (hex) shown on the theme card
  variables: {           // CSS custom properties applied to :root
    '--primary': string,
    '--bg-deep': string,
    // ...any of the vars defined in src/index.css :root
  },
  css?: string,          // optional raw CSS appended after the :root block
}
```

### Theme Manager (in `src/lib/plugin-loader.ts`)

Theme management is handled by `pluginManager` directly in the frontend:

| Method | Description |
|---|---|
| `getTheme(id)` | Lookup by id |
| `getAllThemes()` | Serializable metadata for every registered theme (incl. `variables`, `css`, `isBuiltin`) |
| `loadExternalThemes(dir)` | Reads all `.js` files from directory using Tauri `read_external_files` and loads them into registry |
| `loadThemeFile(filename, content)` | Compiles and loads a theme into the registry via sandboxed CommonJS mock evaluator |

Built-in themes (registered at load): OS-specific themes (macOS, Windows 10/11, Ubuntu in Light/Dark variants). External themes load from `<appDataDir>/themes/` in `initTauriBridge()` at application startup.

### Theme Application (renderer)

`src/App.jsx` injects a `<style id="xf-theme">` element holding a `:root { ... }` block built from `theme.variables`. Three user settings are layered on top before injection (see `buildThemeCss`):

- **accentOverride** — recolors `--primary`, `--accent`, glows, focus border, and gradients from one hex.
- **glassIntensity** (0–100) — remaps the alpha of `--bg-card` / `--bg-panel` (higher = more translucent).
- **monoFont** — swaps `--font-sans` for a monospace stack.

Because the injected `:root` block comes after `index.css`, it wins on equal specificity. `index.css :root` remains the fallback (matches `cyber-glass`).

---

## IPC API Bridge (`src/lib/tauri-bridge.ts`)

All IPC functions are exposed in the frontend webview as `window.api`. Under the hood, they invoke Tauri commands or register event listeners:

### Async Methods

| Method | Tauri Rust Command / Implementation | Returns | Description |
|---|---|---|---|
| `checkDependencies()` | Frontend evaluates plugins asynchronously using `exec_command` | `Promise<PluginStatusMap>` | All plugins' dependency status |
| `selectFolder()` | `select_folder` | `Promise<string \| null>` | Native directory selection dialog |
| `getDefaultDownloadsFolder()` | `get_settings` -> `downloadFolder` or falls back to system download path | `Promise<string>` | Current download directory |
| `openFolder(path)` | `open_folder` | `Promise<boolean>` | Open file in OS file explorer |
| `getVideoInfo(url)` | Frontend routes URL to corresponding plugin `getInfo` | `Promise<{ success, data, pluginId }>` | Auto-routed media info |
| `startDownload(id, url, opts)`| `start_download` | `Promise<boolean>` | Spawns download process in background |
| `cancelDownload(id)` | `cancel_download` | `Promise<boolean>` | SIGTERM/start_kill the process |
| `pauseDownload(id)` | `pause_download` | `Promise<boolean>` | Sends SIGSTOP (Unix only) |
| `resumeDownload(id)` | `resume_download` | `Promise<boolean>` | Sends SIGCONT (Unix only) |
| `saveSettings(settings)` | `save_settings` | `Promise<boolean>` | Persist config.json settings |
| `getPluginConfigs()` | `get_plugin_configs` | `Promise<object>` | Per-plugin configuration map |
| `savePluginConfigs(configs)`| `save_plugin_configs` | `Promise<boolean>` | Save per-plugin configurations |
| `setPluginEnabled(id, enabled)`| Saves settings updating `disabledPlugins` list | `Promise<boolean>` | Toggle plugin enablement |
| `importPluginFile(path)` | `exec_command` with `cat` to read content and saves via `write_external_file` | `Promise<{id, success, error}>` | Import external plugin JS |
| `browsePluginFile()` | `select_file` (js) then imports via `importPluginFile` | `Promise<{id, success, error} \| null>` | Open file picker and import |
| `openPluginsDir()` | `open_folder` with plugins path | `Promise<string>` | Open local plugins folder |
| `getThemes()` | Frontend returns themes from `pluginManager` | `Promise<Theme[]>` | All registered themes |
| `getActiveTheme()` | Reads activeTheme and themeSettings from `get_settings` | `Promise<{ activeTheme, themeSettings }>` | Active theme configurations |
| `setActiveTheme(id)` | Saves settings updating `activeTheme` | `Promise<boolean>` | Switch active theme |
| `saveThemeSettings(s)` | Saves settings updating `themeSettings` object | `Promise<boolean>` | Save glass intensity, mono font, etc. |
| `importThemeFile(path)` | `exec_command` with `cat` to read content and saves via `write_external_file` | `Promise<{id, success, error}>` | Import external theme JS |
| `browseThemeFile()` | `select_file` (js) then imports via `importThemeFile` | `Promise<{id, success, error} \| null>` | Open file picker and import |
| `openThemesDir()` | `open_folder` with themes path | `Promise<string>` | Open local themes folder |

### IPC Events (Tauri Events → Frontend Listeners)

Tauri events are pushed from Rust to the Webview:

```js
// Listens to Rust emitted "download-log" stdout/stderr stream, 
// parses progress using the corresponding plugin's parseProgress(line) in the webview,
// and fires callback:
window.api.onDownloadProgress(({ downloadId, percent, size, speed, eta, status }) => {})

// Listens to Rust emitted "download-complete" event:
window.api.onDownloadComplete(({ downloadId, status }) => {})

// Listens to Rust emitted "download-error" event:
window.api.onDownloadError(({ downloadId, status, error }) => {})
```

---

## Config File (`<appDataDir>/config.json`)

```json
{
  "ytdlpPath": "yt-dlp",
  "ffmpegPath": "ffmpeg",
  "downloadFolder": "/Users/x/Downloads",
  "speedLimit": "",
  "embedSubtitles": false,
  "sponsorBlock": false,
  "stageToTemp": true,
  "organize": "none",
  "disabledPlugins": [],
  "activeTheme": "cyber-glass",
  "themeSettings": { "accentOverride": "", "glassIntensity": 75, "monoFont": false },
  "plugins": {
    "lux":         { "luxPath": "lux", "luxMultiThread": false },
    "gallery-dl":  { "galleryDlPath": "gallery-dl", "galleryDlCookies": "" },
    "spotdl":      { "spotdlPath": "spotdl", "spotdlFormat": "mp3", "spotdlBitrate": "320k" }
  }
}
```

**Download staging.** When `stageToTemp` is on (default), the Rust backend launches the child download process in `<finalFolder>/.xtractforge-tmp/<urlHash>/`. Upon exit code 0, Rust moves the files into the final folder applying `organize` (`none` | `type` | `source`), cleans up the temp folder, and fires the `download-complete` event. On failure, the temp directory is **left in place** to allow the downloader to resume progress later.

---

## Development Workflow

```bash
pnpm install      # Install deps
pnpm dev          # Vite dev server + Tauri dev app (HMR)
pnpm test         # Run the Vitest suite once
pnpm test:watch   # Re-run tests on every change
pnpm release:patch # Bump version + push tag (CI release workflow compiles & builds)
pnpm build        # Production React bundle → dist/
pnpm package:mac  # Tauri build for macOS
pnpm package:win  # Windows
pnpm package:linux
pnpm package:all
```

### CI / Releases (GitHub Actions)

> ⚠️ **Never push, tag, or cut a release unless the user explicitly asks.** Do not run
> `git push`, `pnpm release:*`, `npm version`, `gh release`, or create tags on your own.
> Commits stay local until the user says to push. A release is only triggered when the
> user explicitly requests it.
>
> ✅ **Run `pnpm test` after every commit, and again before pushing.** The suite must be
> green before any push or release; if it fails, fix it first.

- `.github/workflows/ci.yml` — on PR / push to `main`: `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm test` + `pnpm build`.
- `.github/workflows/release.yml` — on `push tag v*.*.*`: matrix (mac/win/linux) compiles and packages the binary using Tauri CLI (`tauri build`) and uploads dmg/exe/AppImage/deb to the GitHub Release.
- Cut a release with `pnpm release:patch|minor|major` — bumps `package.json`, pushes the tag, and opens the generated GitHub Release (needs the `gh` CLI authenticated locally).
- CI installs with `--ignore-scripts` (tests/Vite need no native postinstall; Rust dependencies are compiled directly via Cargo).

---

## Adding a New Built-in Plugin

1. Create `src/plugins/<name>.ts` following the plugin interface above (defined as a TypeScript object)
2. `import` it in `src/lib/plugin-loader.ts` and add it to `BUILTIN_PLUGINS` (before yt-dlp) or `BUILTIN_SEARCHERS`
3. Add the plugin's `repoUrl` and `installHint` fields
4. Test `checkDependency`, `canHandle`, `getInfo`, `buildDownloadArgs`, `parseProgress`

---

## Adding a New Built-in Theme

1. Create `src/themes/<name>.ts` exporting an object with `{ id, name, description, author, mode, swatches, variables }`
2. `import` it in `src/lib/plugin-loader.ts` and add it to `BUILTIN_THEMES`
3. Define `variables` covering the color/bg/text/border/gradient/shadow vars from `src/index.css :root`
4. Verify it renders by selecting it in the Themes tab
