# XtractForge — TODO

Status: `[ ]` todo · `[~]` wip · `[x]` done · `[!]` blocker

---

## 🧪 Testing

### Unit tests (plugin logic)
- [ ] Set up test runner — no test framework yet (add Vitest or Jest)
- [ ] `plugin-manager`: `getDownloaderForUrl` routes correct plugin per URL
- [ ] `plugin-manager`: disabled plugins are skipped in routing
- [ ] `plugin-manager`: yt-dlp always returned as fallback when all others disabled
- [ ] `plugin-manager`: `loadPluginFile` rejects invalid plugin (missing id/name/type)
- [ ] `plugin-manager`: `loadExternalPlugins` skips non-.js files, logs errors per file
- [ ] `plugin-manager`: `getPluginConfig` merges global + plugin-specific correctly
- [ ] Each plugin: `canHandle` returns true for its sites, false for unrelated URLs
- [ ] Each plugin: `parseProgress` extracts correct fields from sample output lines
- [ ] Each plugin: `configSchema` has no duplicate keys

### Integration tests (IPC)
- [ ] `check-dependencies` returns correct shape `{ [id]: { available, version, name, ... } }`
- [ ] `get-video-info` injects `pluginId` in response
- [ ] `set-plugin-enabled` persists to config.json correctly
- [ ] `save-plugin-configs` doesn't clobber unrelated plugin configs
- [ ] `import-plugin-file` returns `{ success: false }` for syntactically broken file
- [ ] `cancel-download` SIGTERM's correct process, not another download

### E2E / manual test checklist
- [ ] `pnpm dev` starts without errors (Vite + Electron both boot)
- [ ] URL analyze: YouTube → routes to yt-dlp
- [ ] URL analyze: Spotify → routes to spotdl
- [ ] URL analyze: Bilibili → routes to annie or lux (whichever is installed)
- [ ] URL analyze: DeviantArt → routes to gallery-dl
- [ ] Download: yt-dlp video completes, file appears in folder
- [ ] Download: progress bar updates in real time
- [ ] Download: cancel kills process, item shows "Cancelled by user"
- [ ] Download: error (bad URL) surfaces in queue item
- [ ] Plugins tab: toggle disable yt-dlp → analyze any URL → still uses yt-dlp (it's hardcoded fallback — document this edge case)
- [ ] Plugins tab: import a valid .js plugin → appears in plugin list after import
- [ ] Plugins tab: import invalid .js → error shown, no crash
- [ ] AI Discover: Ollama not running → graceful error banner (not crash)
- [ ] AI Discover: valid query → results list rendered, click Analyze → switches to Download tab
- [ ] Settings: save → reopen app → values persist (read from config.json)
- [ ] External plugin in `<userData>/plugins/` → auto-loads on next app start

---

## 🐛 Known Issues / Edge Cases

- [ ] yt-dlp can't truly be "disabled" since it's the hardcoded fallback in `getDownloaderForUrl` — decide: throw error or keep silent fallback
- [ ] Annie and Lux handle overlapping sites — priority is Annie first (annie appears before lux in BUILTIN_PLUGINS) — confirm this is correct ordering
- [ ] Ollama plugin: `curl` dependency for `checkDependency` — fails if curl not in PATH; replace with Node.js `http.get`
- [ ] `gallery-dl`: progress reporting is count-based (`#0042`), not percent — progress bar stays at 0% during download; UI should handle this case
- [ ] `spotdl`: `getInfo` returns a stub (no real metadata) because spotdl has no info-only mode — thumbnail always empty
- [ ] `startDownload` progress regex on stderr — lux/annie write progress to stderr, stdout is JSON; verify both streams are parsed
- [ ] `App.jsx`: `disabledPlugins` state initialized to `[]` but never loaded from config on mount — toggle state resets on reload
- [ ] Window width (1200px) added but `electron-builder` `build.files` doesn't include `electron/plugin-manager.js` — verify packaged build resolves module

---

## ✨ Features

### Plugin system
- [ ] Plugin marketplace / registry — browse a JSON index of community plugins, install by URL
- [ ] Plugin version pinning — store which version of a plugin file was imported
- [ ] Plugin update notifications — check plugin repoUrl for newer releases
- [ ] Plugin sandboxing — run untrusted plugins in a worker process, not main process
- [ ] `yt-dlp` as non-disableable anchor (guard in `setPluginEnabled` IPC handler)

### Downloaders / new plugins
- [ ] `N_m3u8DL-RE` plugin — DASH/HLS stream downloader (live streams)
- [ ] `FFmpeg` plugin — direct media conversion/remux without downloading
- [ ] `wget` / `aria2c` plugin — direct URL file download (no metadata extraction)
- [ ] `Cobalt` plugin — cobalt.tools API wrapper (Twitter, TikTok, YouTube Shorts)
- [ ] `PixelDrain` / `GoFile` plugin — file hosting sites
- [ ] Batch input — paste newline-separated URLs, each queued with correct plugin

### AI Discover
- [ ] Model picker dropdown (list models from `ollama/api/tags` dynamically)
- [ ] Search history — save past queries and results locally
- [ ] Direct yt-dlp search passthrough — `ytsearch5:query` without Ollama, for when Ollama is offline
- [ ] Result thumbnails — fetch preview images for suggestions
- [ ] Save result as watchlist — queue multiple suggestions at once

### Download Queue
- [ ] Concurrency limiter — honor `config.maxConcurrent` (currently ignored)
- [ ] Retry failed downloads
- [ ] Download history persistence — survive app restarts (`config.json` or SQLite)
- [ ] Sort/filter queue (by status, plugin, date)
- [ ] Open downloaded file directly (not just folder)
- [ ] Per-item "change destination folder" before starting

### Settings
- [ ] Load `disabledPlugins` from config on app mount (currently not loaded into React state)
- [ ] Save global settings via IPC instead of alert() success message
- [ ] Binary auto-detect button — runs `which yt-dlp` etc. and fills path fields
- [ ] Auto-update yt-dlp: `yt-dlp -U`

### UI / UX
- [ ] Drag-and-drop URL onto window
- [ ] macOS dock badge with active download count
- [ ] System tray (Windows/Linux) — minimize to tray
- [ ] Notification on download complete (OS native)
- [ ] Light/dark mode toggle (follow OS preference)
- [ ] Keyboard shortcuts: `Cmd+V` focus URL bar, `Enter` analyze, `Cmd+D` download
- [ ] Responsive layout — sidebar collapses to icons on narrow window
- [ ] Progress ring instead of bar for audio-only downloads (indeterminate)

---

## 🏗️ Infrastructure

- [ ] Add test script to `package.json` (`vitest` or `jest`)
- [ ] ESLint config (currently none)
- [ ] GitHub Actions CI: lint + build on PR
- [ ] `electron-builder` code signing for macOS (notarization)
- [ ] Auto-updater (`electron-updater`) — check GitHub releases
- [ ] `package.json` description update (still says "yt-dlp GUI")
- [ ] `package.json` author field
- [ ] Move inline styles in App.jsx to CSS classes (currently ~80% inline)
- [ ] Error boundary component in React (uncaught render errors crash whole UI)

---

## 📖 Docs

- [ ] Plugin authoring guide (separate `docs/PLUGIN_GUIDE.md`) with full type signatures
- [ ] Changelog (`CHANGELOG.md`)
- [ ] Contributing guide (`CONTRIBUTING.md`)
- [ ] Screenshot / GIF in README showing each tab
- [ ] Document `<userData>` path per OS (macOS: `~/Library/Application Support/XtractForge`, Windows: `%APPDATA%\XtractForge`, Linux: `~/.config/XtractForge`)
