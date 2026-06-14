# XtractForge — TODO

Status: `[ ]` todo · `[~]` wip · `[x]` done · `[!]` blocker

---

## 🚧 Active worklog (UI/UX overhaul)

Done and pending items from the current redesign pass. Mark, don't delete.

- [ ] i18n: translate remaining strings (settings bodies, plugin/queue/theme detail, buttons)
- [ ] Auto-download/install updates (electron-updater) — currently detect + link only
- [ ] Optional: extract hooks (useQueue/useTheme/...) to isolate re-renders (log streaming)
- [ ] Add component/DOM tests (React Testing Library) on top of the logic tests

---

## 🧪 Testing

### Unit tests (plugin logic) — Vitest, see `tests/`
- [x] Set up test runner (Vitest) — `pnpm test`
- [x] `plugin-manager`: `getDownloaderForUrl` routes correct plugin per URL
- [x] `plugin-manager`: disabled plugins are skipped in routing
- [x] `plugin-manager`: yt-dlp always returned as fallback when all others disabled
- [ ] `plugin-manager`: `loadPluginFile` rejects invalid plugin (missing id/name/type)
- [ ] `plugin-manager`: `loadExternalPlugins` skips non-.js files, logs errors per file
- [x] `plugin-manager`: `getPluginConfig` merges global + plugin-specific correctly
- [x] Each plugin: `canHandle` returns true for its sites, false for unrelated URLs
- [x] Each plugin: `parseProgress` extracts correct fields from sample output lines
- [x] Each plugin: `configSchema` has no duplicate keys
- [x] `theme-manager`: registry shape, default-first, lookup, rejects bad file
- [x] `src/lib`: format/theme/plugins helpers

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
- [ ] URL analyze: Bilibili → routes to lux
- [ ] URL analyze: DeviantArt → routes to gallery-dl
- [ ] Download: yt-dlp video completes, file appears in folder
- [ ] Download: progress bar updates in real time
- [ ] Download: cancel kills process, item shows "Cancelled by user"
- [ ] Download: error (bad URL) surfaces in queue item
- [ ] Plugins tab: toggle disable yt-dlp → analyze any URL → still uses yt-dlp (it's hardcoded fallback — document this edge case)
- [ ] Plugins tab: import a valid .js plugin → appears in plugin list after import
- [ ] Plugins tab: import invalid .js → error shown, no crash
- [ ] Settings: save → reopen app → values persist (read from config.json)
- [ ] External plugin in `<userData>/plugins/` → auto-loads on next app start

---

## 🐛 Known Issues / Edge Cases

- [ ] yt-dlp can't truly be "disabled" since it's the hardcoded fallback in `getDownloaderForUrl` — decide: throw error or keep silent fallback
- [ ] `gallery-dl`: progress reporting is count-based (`#0042`), not percent — progress bar stays at 0% during download; UI should handle this case
- [ ] `spotdl`: `getInfo` returns a stub (no real metadata) because spotdl has no info-only mode — thumbnail always empty
- [ ] `startDownload` progress regex on stderr — lux writes progress to stderr, stdout is JSON; verify both streams are parsed
- [x] `App.jsx`: `disabledPlugins` now hydrated from config on mount (get-settings IPC)
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
- [x] `FFmpeg` plugin — HLS/DASH/RTMP/RTSP stream recording
- [x] `curl` plugin — direct URL file download (no metadata extraction)
- [ ] `N_m3u8DL-RE` plugin — DASH/HLS stream downloader (live streams)
- [ ] `Cobalt` plugin — cobalt.tools API wrapper (Twitter, TikTok, YouTube Shorts)
- [ ] `PixelDrain` / `GoFile` plugin — file hosting sites
- [ ] Batch input — paste newline-separated URLs, each queued with correct plugin

### Download Queue
- [ ] Concurrency limiter — honor `config.maxConcurrent` (currently ignored)
- [ ] Retry failed downloads
- [ ] Download history persistence — survive app restarts (`config.json` or SQLite)
- [ ] Sort/filter queue (by status, plugin, date)
- [ ] Open downloaded file directly (not just folder)
- [ ] Per-item "change destination folder" before starting

### Settings
- [x] Load `disabledPlugins` from config on app mount
- [x] Save global settings via IPC (auto-save with inline confirmation)
- [ ] Binary auto-detect button — runs `which yt-dlp` etc. and fills path fields
- [ ] Auto-update yt-dlp: `yt-dlp -U`

### UI / UX
- [ ] Drag-and-drop URL onto window
- [ ] macOS dock badge with active download count
- [ ] System tray (Windows/Linux) — minimize to tray
- [ ] Notification on download complete (OS native)
- [ ] Keyboard shortcuts: `Cmd+V` focus URL bar, `Enter` analyze, `Cmd+D` download
- [ ] Responsive layout — sidebar collapses to icons on narrow window
- [ ] Progress ring instead of bar for audio-only downloads (indeterminate)

---

## 🏗️ Infrastructure

- [x] Add test script to `package.json` (Vitest)
- [ ] ESLint config (currently none)
- [x] `package.json` description update
- [x] `package.json` author field (`albertolicea00`)
- [ ] Move inline styles in App.jsx to CSS classes (currently ~80% inline)
- [x] Error boundary component in React (uncaught render errors crash whole UI)
- [x] Release: `pnpm release:patch|minor|major` bumps version + pushes tag → release workflow

### 🚀 GitHub Actions — CI/CD & Releases

- [x] **`.github/workflows/ci.yml`** — on PR/push to main: install, `pnpm test`, `pnpm build`
- [x] **`.github/workflows/release.yml`** — on `push tag v*.*.*`: matrix (mac/win/linux),
  `electron-builder --<os> --publish always` (GitHub provider) creates the release + uploads
  dmg/exe/AppImage/deb. Trigger via `pnpm release:patch|minor|major`. Builds **unsigned** for now.

- [ ] **macOS code signing** — `electron-builder` needs `CSC_LINK` (p12 cert base64) + `CSC_KEY_PASSWORD` in repo secrets
- [ ] **macOS notarization** — add `afterSign` hook or `notarize` package; requires Apple Developer account
- [ ] **Windows code signing** — `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` in repo secrets (optional but kills SmartScreen warning)
- [ ] **Auto-updater** — add `electron-updater`, configure `publish` in `electron-builder` config pointing to GitHub releases
- [ ] **Homebrew cask** — after first release, submit PR to `homebrew/homebrew-cask` or maintain personal tap `albertolicea00/homebrew-xtractforge`
- [ ] **winget manifest** — submit to `microsoft/winget-pkgs` after first release
- [ ] **Snap / AUR** — `snapcraft.yaml` for Snap Store; `PKGBUILD` for AUR submission

---

## 📖 Docs

- [ ] Plugin authoring guide (separate `docs/PLUGIN_GUIDE.md`) with full type signatures
- [ ] Changelog (`CHANGELOG.md`)
- [ ] Document `<userData>` path per OS (macOS: `~/Library/Application Support/XtractForge`, Windows: `%APPDATA%\XtractForge`, Linux: `~/.config/XtractForge`)
