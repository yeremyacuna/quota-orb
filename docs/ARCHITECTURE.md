# Architecture

## Runtime processes

Quota Orb uses one Electron main process and one sandboxed renderer. The main process owns the window, tray, login startup, local HTTP server, quota readers, and IPC validation. The renderer is limited to displaying quota summaries and reporting its measured height through the narrow `usageBridge` preload API.

The local server binds to `127.0.0.1` on an available random port. It serves a fixed allowlist of UI files and `GET /api/usage`. It rejects non-loopback Host headers, foreign Origin headers, cross-site requests, non-GET methods, and unknown paths. No CORS access is enabled.

## Data flow

### Codex

The Codex reader enumerates session metadata, reads only the final 512 KiB of up to 24 recent JSONL files, and compares the timestamps inside rate-limit events. It selects the weekly window by `window_minutes === 10080`, independently of whether Codex places it under `primary` or `secondary`.

This avoids showing stale data when several sessions are active or an older conversation is resumed. No Codex token is read and no additional OpenAI network request is made.

### Claude

The Claude reader loads the official CLI credential on Windows and Linux, or the official Keychain item on macOS. The access token is sent only to Anthropic's HTTPS OAuth usage endpoint and is never exposed to the renderer or logs.

Response parsing supports `seven_day.utilization` and the legacy `limits[kind=weekly_all]` shape. A three-minute memory cache coalesces concurrent requests. Network failures use bounded exponential backoff and preserve the last valid value as stale.

When the credential is close to expiry, renewal is delegated to the official Claude CLI. Quota Orb does not implement OAuth renewal and never writes the credential file.

## Local data

Window position, Chromium session data, diagnostics, and the empty MCP configuration used during Claude renewal live under Electron's operating-system-managed `userData` directory. On Windows this is normally below `%APPDATA%\Quota Orb`.

The installation directory contains packaged application resources and the Electron runtime only. User state is not stored beside the executable.

## Renderer security

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`, plus application-wide sandboxing
- webviews disabled
- browser permissions denied
- navigation and new windows denied
- production DevTools disabled
- restrictive CSP and browser security headers
- IPC sender and numeric input validation

The page loads no remote scripts, fonts, images, analytics, or telemetry.
