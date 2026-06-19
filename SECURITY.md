# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest (`main`) | ✅ |
| Older releases | ❌ — update to latest |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via one of these channels:

1. **GitHub Security Advisory** — use the "Report a vulnerability" button in the Security tab of this repository (preferred)
2. **Email** — send details to the maintainers listed in `package.json` or `CONTRIBUTING.md`

### What to include

- Description of the vulnerability and its potential impact
- Steps to reproduce
- Affected version(s)
- Any suggested fix or mitigation (optional but appreciated)

### Response timeline

- **Acknowledgement**: within 72 hours
- **Initial assessment**: within 7 days
- **Fix / advisory**: as soon as reasonably possible, typically within 30 days for critical issues

## Scope

### In scope

- Vulnerabilities in XtractForge application code (`src-tauri/`, `src/`)
- Tauri Command and IPC security issues
- Plugin sandbox escapes or privilege escalation
- Insecure default configuration that could harm users
- Path traversal or command injection in download argument construction

### Out of scope

- Vulnerabilities in third-party tools (yt-dlp, ffmpeg, Lux, gallery-dl, spotDL) — report these to their respective projects
- Issues that require physical access to the machine
- Social engineering

## Security Model

XtractForge runs within Tauri's secure multi-process model. The WebView process (React UI) has no direct access to native APIs — all system access goes through the secure commands exposed by the Rust core process in `src-tauri/`.

External plugins loaded from `<appDataDir>/plugins/` run inside the WebView process using a sandboxed CommonJS mock evaluator. They do not have direct access to native Node.js or Rust APIs; instead, they interact with the system via the `window.api` bridge (e.g. `execCommand` for binary invocations). Only load plugin files from sources you trust.
