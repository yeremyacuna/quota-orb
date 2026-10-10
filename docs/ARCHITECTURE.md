# Architecture

One Electron process hosts everything:

1. **Main process** (`src/main.js`): creates the frameless, transparent, always-on-top window (`screen-saver` level, `skipTaskbar`, not resizable), the tray icon, the login item and persists the window position in `userData/window-position.json` (validated against the visible displays on restore).
2. **Local server** (`src/server.js`): plain `http` bound to `127.0.0.1`. `GET /api/uso` returns `{ codex, claude, updatedAt }`; static files are served from a whitelist. Foreign `Host` headers are rejected (DNS-rebinding guard).
3. **Renderer** (`src/ui`): fetches `/api/uso` every 60 s, paints the rings and measures its own height, sending it to the main process over IPC (`usageBridge.setHeight`) so the window fits.

## Data flow

- **Codex** (`src/codex.js`): newest JSONL files → read last 512 KB → last `rate_limits` line → the entry with `window_minutes = 10080`.
- **Claude** (`src/claude.js`): credentials (file, or Keychain on macOS) → `GET /api/oauth/usage` with `Authorization: Bearer …` and `anthropic-beta: oauth-2025-04-20` → `limits[kind=weekly_all]`. 3-minute in-memory cache. Token refresh is delegated to the official CLI (≤ 1 attempt / 10 min).

## Status values

`ok` · `noauth` (no CLI login) · `expired` · `nodata` · `noweekly` · `error`. Anything but `ok` renders an empty ring.
