# Changelog

## 1.1.0

- **OAuth2 authentication** — log in with your Filestack account on first use; no API keys or environment variables needed
- **Cursor support** — plugin now works with both Claude Code and Cursor via dual-platform manifests
- **Remote MCP servers** — three Filestack-hosted servers (`filestack-files`, `filestack-transforms`, `filestack-security`) with OAuth2 auth
- **Local MCP server** preserved as advanced option for offline use and local-only policy signing

## 1.0.0

Initial release.

- 10 MCP tools: file operations (upload, retrieve, delete, store_url), transforms (transform_url, transform_apply, list_transforms), security (generate_policy, sign_policy, generate_signed_url)
- 3 auto-triggered skills: sdk-integration, webhook-setup, error-diagnosis
- 1 slash command: /filestack-transform
- GitHub Actions CI with npm publish on tag
