# Contributing to XtractForge

Thanks for your interest in contributing. This guide covers everything you need to get started.

---

## Table of Contents

- [Ways to contribute](#ways-to-contribute)
- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Writing a plugin](#writing-a-plugin)
- [Submitting a pull request](#submitting-a-pull-request)
- [Issue guidelines](#issue-guidelines)
- [Code style](#code-style)
- [Community standards](#community-standards)

---

## Ways to Contribute

- **Bug reports** — open an issue using the Bug Report template
- **Feature requests** — open an issue using the Feature Request template
- **Plugin submissions** — add your plugin to [ADDONS.md](ADDONS.md) via PR
- **Code contributions** — bug fixes, new features, UI improvements
- **Documentation** — fix typos, clarify instructions, improve examples
- **Testing** — test on Windows/Linux/macOS and report issues

---

## Development Setup

### Requirements

- Node.js 16+
- pnpm (`npm install -g pnpm`)
- Git

### Install and run

```bash
git clone https://github.com/albertolicea00/XtractForge.git
cd XtractForge
pnpm install
pnpm dev
```

`pnpm dev` starts the Vite dev server (port 5173) and opens Electron with HMR. Changes to `src/` hot-reload instantly. Changes to `electron/` require restarting.

### Build

```bash
pnpm build           # React bundle → dist/
pnpm package:mac     # macOS DMG
pnpm package:win     # Windows NSIS
pnpm package:linux   # Linux AppImage + deb
```

### Tests

```bash
pnpm test            # run the suite once (Vitest)
pnpm test:watch      # re-run on every change while developing
```

Tests live in [`tests/`](tests/) and cover the pure logic — formatting/theme/plugin
helpers (`src/lib/`), each built-in plugin (`canHandle`, `parseProgress`,
`buildDownloadArgs`, schema validity), and the plugin/theme managers (URL routing,
registry, config merge). They run in Node (no DOM), so they're fast.

**Run `pnpm test` after every commit, and again before pushing and before opening a PR** The suite must be
green before any push or release — if it fails, fix it first. Add or update tests when
you change plugin routing, a helper, or a manager — keep regressions out.

---

## Project Structure

```
electron/
  main.js              Main process — IPC, plugin dispatch, settings
  preload.js           contextBridge — secure API exposed to renderer
  plugin-manager.js    Plugin registry and URL routing
  plugins/             Built-in plugins (one file each)
src/
  App.jsx              Main React component (all UI tabs)
  index.css            Dark theme CSS
  main.jsx             React entry point
  index.html           HTML shell
```

Key data flows:

1. User pastes URL → renderer calls `window.api.getVideoInfo(url)`
2. IPC → `main.js` → `plugin-manager.getDownloaderForUrl(url)` → correct plugin's `getInfo()`
3. Result → renderer renders format picker
4. User clicks Download → `window.api.startDownload(...)` → plugin's `buildDownloadArgs()` → `spawn(binary, args)`
5. stdout lines → plugin's `parseProgress()` → IPC push → queue progress bar

---

## Writing a Plugin

See [ADDONS.md](ADDONS.md) for the full plugin API. Quick start:

1. Copy `electron/plugins/ytdlp.js` to `electron/plugins/my-tool.js`
2. Update all fields (`id`, `name`, `repoUrl`, `canHandle`, etc.)
3. Register it in `electron/plugin-manager.js` — add to `BUILTIN_PLUGINS` (before yt-dlp)
4. Test all methods manually
5. Submit a PR

To share a community plugin without modifying core:

1. Write your `.js` file following the plugin interface
2. Publish it anywhere (GitHub Gist, npm, your own repo)
3. Open a PR to add it to the community plugins table in [ADDONS.md](ADDONS.md)

---

## Submitting a Pull Request

1. **Fork** the repository and create a branch from `main`

   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/the-bug
   ```

2. **Make changes** — keep commits focused and atomic

3. **Test** — run `pnpm test` (and add tests for new logic), then `pnpm dev` to verify on your OS

4. **Update docs** — if you added a feature, update README, ADDONS.md, or AGENTS.md as needed; if you added a TODO entry it's done, remove it from TODO.md

5. **Open a PR** — fill in the PR template; link any related issues

### PR checklist

- [ ] `pnpm test` passes (added/updated tests for changed logic)
- [ ] Tested on my OS with `pnpm dev`
- [ ] No new `console.error` left unhandled
- [ ] Docs updated if applicable
- [ ] No hardcoded paths or secrets

---

## Issue Guidelines

- **Search first** — check existing issues before opening a new one
- **One issue per report** — don't bundle multiple bugs or features
- **Include reproduction steps** for bugs — OS, app version, what you did, what you expected, what happened
- **Use the templates** — Bug Report, Feature Request, or Plugin Submission

---

## Code Style

- **JavaScript only** — no TypeScript (Electron main process is plain CJS; renderer is JSX via Vite)
- **No comments explaining what the code does** — only add comments when the *why* is non-obvious
- **No unused imports** — remove them
- **Plugin files are self-contained** — no cross-plugin imports
- Formatting: 2-space indent, single quotes in JS

---

## Community Standards

All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful. Focus on the work.
