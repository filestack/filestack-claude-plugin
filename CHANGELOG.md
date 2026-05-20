# Changelog

## 1.2.1

- **Cleanup release** — internal-only changes, no functional differences
- Remove redundant `"skills": "./skills/"` entry from `plugin.json` (default auto-discovery path)
- Drop non-standard `version`/`license` fields from individual SKILL.md frontmatter (license lives in plugin.json)
- Delete duplicate `PLUGIN_DESCRIPTION.md` (content already in README.md)
- Add language identifiers to fenced code blocks in `/filestack-transform` command

## 1.2.0

- **Fix MCP server registration** — `.mcp.json` now uses the required `mcpServers` wrapper, restoring the 10 Filestack tools that previously failed to register
- **Bundled MCP server** — ships `mcp/dist/bundle.js` so the plugin works without `npm install`
- **Portable paths** — MCP server path uses `${CLAUDE_PLUGIN_ROOT}` for install-location independence
- **SDK skill: stop hardcoding the demo key into generated user code** — scaffolds now emit `import.meta.env.VITE_FILESTACK_API_KEY ?? '<demo>'` (or framework equivalent) so users can swap in their own key via env var without code changes
- **`/filestack-transform` command** — removed restrictive empty `allowed-tools` constraint

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
