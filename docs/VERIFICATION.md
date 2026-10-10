# Verification Record

Last updated: October 10, 2026 (America/Lima).

## Verified on Windows 11

- All automated tests pass: time formatting, color thresholds, JSONL tail parsing, internal timestamp selection, weekly-window selection, expired resets, missing data, Claude response formats, and local HTTP protections.
- The dependency tree reports no known npm vulnerabilities after resolving the build toolchain to the maintained `@electron/get` release.
- The secret checker scans tracked filenames and text without printing suspected values.
- The NSIS x64 installer builds with Electron 44.7.0 and electron-builder 26.15.3.
- The packaged application contains `src/`, `assets/`, and runtime metadata in `app.asar`; repository documentation, tests, tools, credentials, and local state are excluded.
- Concurrent real Codex sessions were compared against the app. Selecting events by their internal timestamp fixed a stale 90% reading and produced the same weekly value shown by Codex.
- The packaged executable opens as a 140 × 106 pixel always-on-top window with two aligned columns and an isolated preload bridge.
- Tray creation and show/hide behavior were verified programmatically.
- `getLoginItemSettings().openAtLogin` returned `true`. A complete Windows sign-out or reboot has not yet been used to verify the next launch.
- The local API returned real Codex data and the expected unauthenticated Claude state.
- The public screenshot was generated with fictitious values using `capturePage()` and contains only the widget.
- Position persistence restored and saved the test position. A second application launch reused the existing main process.

## Still requires real-world verification

- Claude authentication by the owner with `claude auth login`, the account-specific usage response, and Haiku renewal near token expiry.
- Separate free and paid account variants.
- macOS and Linux behavior.
- Manual drag behavior, monitor topology changes, exclusive full-screen games, and a complete Windows restart.
- Live Anthropic 401, 429, and 5xx failures and a deliberately skewed system clock. The code handles these cases, but they have not been forced against a real account.

The public installer is currently unsigned. The repository uses the SSH remote `git@github.com:yeremyacuna/quota-orb.git`. Release `v1.0.1` contains the security, packaging, and English-language revisions documented here.
