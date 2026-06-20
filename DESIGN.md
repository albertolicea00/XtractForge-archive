# XtractForge — High-Tech Media Extraction System

## North Star: "The Digital Forge"
A high-performance, technical workspace for media extraction. The interface balances high-density information with a "Cyber-Glass" aesthetic, prioritizing precision, real-time feedback, and modular control.

## Visual Identity & Theming
The system supports multiple visual modes to adapt to the user's context.

### Core Aesthetic: Cyber-Glass (Default Dark)
- **Surface**: `#131314` (Deep Charcoal base)
- **Primary**: `#3b82f6` (Electric Blue — Actions & Focus)
- **Secondary**: `#a855f7` (Cyber Purple — AI & Experimental features)
- **Tertiary**: `#10b981` (Mint Green — Success & Active states)
- **Border**: `rgba(255, 255, 255, 0.1)` (Frosted Glass effect)

### Multi-Theme Architecture
Theme management is handled through a dedicated **Theme Selector** menu, separate from general system settings, allowing for instantaneous aesthetic switching:
- **Cyber-Glass**: The default high-performance dark mode.
- **Alexandria**: A scholarly, premium light theme for editorial/reading-focused content.
- **Matrix**: A high-contrast terminal mode for a purely technical "hacker" aesthetic.

## Typography
- **Primary Font**: `INTER`
- **Technical Font**: `Mono` fonts for bitrates, file paths, and versions.
- **Scale**: High-contrast ratios to ensure legibility in dense data views.

## Component Patterns
- **Glassmorphism**: Surfaces use `backdrop-blur-xl` and subtle gradients to create depth.
- **Micro-interactions**: Scale transforms (`active:scale-95`) and glow transitions for background processes.
- **Modals**: High-blur backdrops for focused tasks (e.g., New Extraction).
- **Cards**: Tightly packed with 1px borders for maximum information density.

## Information Architecture
- **Home**: Central command with a focus on quick URL entry and a Floating Action Button for immediate tasks.
- **Queue**: Real-time monitoring hub with detailed progress metrics (ETA, speed, storage status).
- **Plugins**: Modular management for extraction engines (yt-dlp, spotDL, gallery-dl, lux, ffmpeg, curl) — card grid + per-plugin settings page.
- **Themes**: A dedicated top-level or sidebar section for aesthetic customization.
- **Settings**: System-level configuration (threads, performance, hooks, background behavior).

## Experience Principles
1. **Transparency**: Real-time status for all system components.
2. **Modular Sovereignty**: Plugins are first-class citizens with individual markers.
3. **Power-User Efficiency**: Keyboard-friendly inputs and high-density technical metadata.

## Code Structure
- `App.jsx` is a thin **shell**: owns state/handlers/effects, renders `Sidebar` + the active tab.
- Each view is its own component under `src/components/` (`Sidebar`, `tabs/{Download,Queue,Plugins,Themes,Settings}Tab`).
- Pure, framework-free logic lives in `src/lib/` (`format`, `theme`, `plugins`, `queue`) and is unit-tested.
- Themes and plugins are TypeScript files for built-ins (under `src/{themes,plugins}/`), while external community plugins/themes are loaded dynamically as single `.js` files.
- Tests: `tests/` (Vitest) — run `pnpm test` / `pnpm test:watch`. See [AGENTS.md](AGENTS.md) for the full map.
