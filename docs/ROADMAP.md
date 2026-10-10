# Roadmap

## Completed

- [x] Weekly remaining-usage rings for Codex and Claude
- [x] Tray icon, login startup, single-instance protection, and position memory
- [x] Windows x64 installer and automated GitHub release workflow
- [x] Sandboxed renderer, restrictive CSP, denied browser permissions, and loopback request validation
- [x] Automated tests, secret checking, dependency auditing, CodeQL, and Dependabot
- [x] English source messages and project documentation
- [x] OS-managed user-data storage outside the installation directory

## Application settings

The widget should remain compact. Configuration will live in a separate application window opened from the tray menu.

- [ ] **General:** launch at login, refresh interval, always-on-top behavior, and reset position
- [ ] **Accounts:** Codex/Claude connection status, Claude sign-in guidance, and last successful refresh
- [ ] **Appearance:** widget scale, opacity, theme, ring colors, and optional labels
- [ ] **Providers:** enable or hide either provider and select supported quota windows
- [ ] **Privacy:** enable or disable Claude auto-renewal and show exactly what leaves the device
- [ ] **Diagnostics:** sanitized status, application version, log location, and copyable error details without tokens
- [ ] **About:** release channel, license, third-party notices, and update controls

Settings should be validated in the main process and stored as a versioned JSON document under Electron's `userData` directory. The renderer must receive only the specific values it needs through narrow IPC methods.

## Distribution and platform work

- [ ] Digitally sign the Windows installer
- [ ] Add a verified update mechanism with signed release metadata
- [ ] Test installation, startup, migration, and uninstall in a clean Windows 11 virtual machine
- [ ] Verify the legacy Claude percentage semantics against real account responses
- [ ] Validate and package macOS and Linux releases
- [ ] Add an optional 5-hour Codex window
