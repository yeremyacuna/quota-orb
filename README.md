<div align="center">

# 🔵 Quota Orb

**A tiny floating desktop widget that shows how much weekly usage you have LEFT in Codex and Claude**

Built with Electron · Node.js (zero runtime dependencies) · Simple Icons

![Tests](https://img.shields.io/github/actions/workflow/status/yeremyacuna/quota-orb/validate.yml?branch=main&style=for-the-badge&label=validation&logo=githubactions&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)

<img src="docs/screenshot.png" alt="Quota Orb widget" width="280">

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Architecture](#️-architecture)
- [Getting Started](#-getting-started)
- [Data Sources & Known Pitfalls](#-data-sources--known-pitfalls)
- [Configuration](#️-configuration)
- [Project Structure](#-project-structure)
- [Security & Privacy](#-security--privacy)
- [Roadmap](#️-roadmap)

---

## 📋 Overview

- 140 × 100 px frameless window, always on top, draggable from anywhere, remembers its position.
- Two rings side by side: **Codex** (white OpenAI logo) and **Claude** (orange `#D97757` logo).
- A full ring = 100 % left; it empties as you spend. 🟢 > 40 % · 🟡 15–40 % · 🔴 < 15 %.
- Below each ring: the remaining % and the time to reset (`5 d 9 h`). Weekly limit only.
- System tray icon: click shows/hides, right click → **Cerrar**. No taskbar icon.
- Refreshes every minute and starts with your session (login item).

## 🏗️ Architecture

```
~/.codex/sessions/**/*.jsonl ──┐
                               ├─> Node server (127.0.0.1, same process) ──> /api/uso ──> index.html
api.anthropic.com/api/oauth/usage ─┘                                              │
                                                              IPC (height) ──> Electron window
```

Details in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 🚀 Getting Started

```bash
git clone https://github.com/yeremyacuna/quota-orb.git
cd quota-orb
npm install
npm start
```

If `npm install` doesn't leave the Electron binary: `node node_modules/electron/install.js`.

Build an installer: `npm run dist`. Run the tests: `npm test`.

## 🔌 Data Sources & Known Pitfalls

| Source | How | Notes |
| ------ | --- | ----- |
| **Codex** | Reads the tail of the newest `~/.codex/sessions/YYYY/MM/DD/*.jsonl` and takes the last `rate_limits` line | No network, no token. The weekly window is the one with `window_minutes = 10080`. If `resets_at` already passed → 100 %. |
| **Claude** | `GET https://api.anthropic.com/api/oauth/usage` (`weekly_all`) | **Undocumented endpoint — it may change.** Cached 3 minutes. |

**Claude requirements**

- Only using the Claude desktop app? Then `~/.claude/.credentials.json` has no `claudeAiOauth`. Run **`claude auth login`** once in the CLI. Until then the Claude ring shows empty. (On macOS the token lives in the Keychain.) The widget does not look for the token anywhere else.
- The token lasts 8 hours and only the CLI renews it. When it is about to expire the widget runs
  `claude -p "ok" --model haiku --strict-mcp-config --mcp-config '{"mcpServers":{}}'` (at most once every 10 minutes) and re-reads the file. **This spends a few tokens, about three times a day.** The widget never implements OAuth refresh itself and never writes to the credentials file.
- Exclusive-fullscreen games cover the widget; use "windowed fullscreen".
- ⚠️ The meaning of `percent` in the Claude response (used vs. remaining) is treated as **used**. If your ring looks inverted, set `QUOTA_ORB_CLAUDE_PERCENT=remaining`.

## ⚙️ Configuration

| Variable | Purpose |
| -------- | ------- |
| `CODEX_HOME` | Alternative Codex folder (default `~/.codex`) |
| `CLAUDE_CONFIG_DIR` | Alternative Claude folder (default `~/.claude`) |
| `QUOTA_ORB_CLAUDE_PERCENT` | `used` (default) or `remaining` |
| `QUOTA_ORB_NO_AUTOSTART` | Set to skip registering the login item |
| `QUOTA_ORB_SCREENSHOT` | Path: capture only the window area to a PNG and quit |

## 📁 Project Structure

```
quota-orb/
├── .github/workflows/   # CI: tests + secret scan
├── assets/              # Tray icon
├── docs/                # Architecture, roadmap, screenshot
├── src/
│   ├── main.js          # Window, tray, IPC, autostart
│   ├── preload.js       # contextBridge (usageBridge)
│   ├── server.js        # Local HTTP server (127.0.0.1)
│   ├── codex.js         # Codex session reader
│   ├── claude.js        # Claude usage client + CLI refresh
│   ├── lib/format.js    # Colours, countdown, helpers
│   └── ui/              # index.html · style.css · app.js
├── test/                # node:test unit tests
└── tools/make-icon.js   # Generates the tray icon
```

## 🔒 Security & Privacy

- The server only listens on `127.0.0.1` and rejects foreign `Host` headers.
- Nothing leaves your machine except the usage query to Anthropic.
- The Claude token is only held in memory and is **never printed, logged or committed**.
- Strict CSP, `contextIsolation`, sandboxed renderer.

## 🗺️ Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

Logos: [Simple Icons](https://simpleicons.org) (CC0). OpenAI and Claude are trademarks of their respective owners; this project is not affiliated with them.

Made with 🤍 by [@yeremyacuna](https://github.com/yeremyacuna)
