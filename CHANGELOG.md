# Changelog

## 1.1.0

- **Cursor support** — plugin now works with both Claude Code and Cursor via dual-platform manifests
- **Demo API key fallback** — works out of the box without configuration using the built-in demo key
- **SDK skill improvements** — scaffolds in current directory, uses demo key, auto-runs dev server

## 1.0.0

Initial release.

- 10 MCP tools: file operations (upload, retrieve, delete, store_url), transforms (transform_url, transform_apply, list_transforms), security (generate_policy, sign_policy, generate_signed_url)
- 3 auto-triggered skills: sdk-integration, webhook-setup, error-diagnosis
- 1 slash command: /filestack-transform
- GitHub Actions CI with npm publish on tag
