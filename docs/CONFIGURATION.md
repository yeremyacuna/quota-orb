# Owner Configuration

Quota Orb does not load `.env` files automatically. The variables below are optional process environment variables intended for development, diagnostics, or advanced deployments.

| Variable | Purpose | Default |
|---|---|---|
| `CODEX_HOME` | Overrides the Codex data directory. | `~/.codex` |
| `QUOTA_ORB_PORT` | Uses a fixed loopback port instead of an available random port. | Random port |
| `QUOTA_ORB_NO_AUTOSTART=1` | Prevents Quota Orb from registering itself at login. | Autostart enabled |
| `QUOTA_ORB_NO_REFRESH=1` | Disables Claude CLI token renewal. | Renewal enabled |
| `QUOTA_ORB_CLAUDE_PERCENT=remaining` | Treats the legacy Claude `limits[].percent` field as remaining instead of used. | Used percentage |
| `QUOTA_ORB_DEMO=1` | Displays fictitious values for screenshots and UI development. | Disabled |
| `QUOTA_ORB_VERIFY=1` | Writes a local verification report to the OS user-data directory. | Disabled |
| `QUOTA_ORB_SCREENSHOT=<path>` | Captures only the widget window and exits. | Disabled |

Never place access tokens in environment files for this project. Codex usage is read from local session metadata, and Claude authentication is read only from the official Claude CLI credential location.

## Files an owner should know

- `package.json` defines scripts, the Electron entry point, installer identity, packaged files, shortcuts, and the Windows target.
- `package-lock.json` pins the complete build dependency graph. Update it only through npm.
- `.github/workflows/validate.yml` runs tests, secret checks, and dependency auditing.
- `.github/workflows/release.yml` builds and publishes tagged Windows installers.
- `.github/workflows/codeql.yml` performs static security analysis.
- `.github/dependabot.yml` schedules dependency update pull requests.
- `.gitignore` prevents local state, credentials, certificates, logs, and build output from being committed.
- `SECURITY.md` explains supported versions and private vulnerability reporting.
