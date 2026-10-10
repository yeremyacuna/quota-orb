# Security Policy

## Supported versions

Security fixes are applied to the latest published release and the `main` branch. Older releases may no longer receive fixes.

| Version | Supported |
|---|---|
| Latest release | Yes |
| `main` | Yes |
| Older releases | No |

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue. Use GitHub's [private vulnerability reporting form](https://github.com/yeremyacuna/quota-orb/security/advisories/new) instead.

Include the affected version, operating system, reproduction steps, impact, and any proposed mitigation. Do not include real access tokens, credential files, or private account data. You can expect an initial response within seven days.

## Security boundaries

Quota Orb reads Codex session metadata locally and sends the Claude OAuth access token only to Anthropic's HTTPS usage endpoint. Tokens are never sent to the renderer, stored by Quota Orb, printed in logs, or included in diagnostics.

The renderer is sandboxed and isolated from Node.js. Browser permissions, navigation, and new windows are denied. The local HTTP server listens only on `127.0.0.1`, validates the Host and Origin headers, applies a restrictive Content Security Policy, and returns only non-sensitive quota summaries.

No software can guarantee complete security. Keep Windows, Electron dependencies, Codex, and the Claude CLI updated, and install Quota Orb only from this repository's official Releases page.
