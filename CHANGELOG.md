# Changelog

## 1.2.4

Transforms manifest expansion — `filestack_list_transforms` now documents **58 transforms** across image, decorative, face, intelligence, document, video, capture, archive, code, format, storage, and delivery categories (was 14 image-only transforms).

New entries beyond the original 14:

- **Image processing**: `smart_crop`, `quality`, `pjpg`, `auto_image`, `no_metadata`, `imagesize`, `upscale`, `redeye`, `blackwhite`, `negative`, `oil_paint`, `ascii`, `modulate`, `partial_blur`, `partial_pixelate`, `pixelate`, `collage`, `animate`
- **Decorative**: `border`, `shadow`, `rounded_corners`, `circle`, `polaroid`, `vignette`, `torn_edges`
- **Face operations**: `detect_faces`, `blur_faces`, `pixelate_faces`
- **Intelligence (AI/ML)**: `tags`, `sfw`, `caption`, `ocr`, `copyright`, `doc_detection`, `image_sentiment`, `text_sentiment`
- **Document**: `pdfinfo`, `pdfconvert`
- **Video**: `video_convert` (use `filestack_convert_video` tool for proper async handling in v1.3.0)
- **Capture**: `urlscreenshot`
- **Archive**: `zip`
- **Code minification**: `minify_js`, `minify_css`
- **Format conversion**: `output` (formal entry with full param surface)
- **Storage/delivery**: `store`, `cache`, `fallback`, `security`

Every entry now has a `category` field, and params include `values` enums where applicable. This is a pure data update — no API changes, no new tools. Existing transforms keep the same name/param contract.

## 1.2.3

Domain-correctness pass — fixes 9 issues where the plugin's behavior or documentation diverged from the actual Filestack platform. Verified against the SDKs (filestack-js, filestack-python), the server-side policy decoder (`filestack-api/filepicker/fppolicy.py`), and the official docs (`docs/content/security/policies.md`).

**Critical (signed URLs previously broken)**:

- **Keep base64 padding on policy strings.** Filestack's server uses `base64.urlsafe_b64decode` which strictly requires `len % 4 == 0`. The plugin's `.replace(/=+$/, '')` produced unpaddable strings that the server rejected with `"policy was not properly url-safe base64 encoded"` for any policy whose JSON length wasn't a multiple of 3 bytes (i.e. most policies). All signed URLs are now valid.
- **Use canonical path-based signed URL format.** Old form: `cdn.filestackcontent.com/<handle>?apikey=...&policy=...&signature=...`. New form (matches `filestack-python`, `filestack-js`, official docs): `cdn.filestackcontent.com/security=policy:<policy>,signature:<signature>/<handle>`. The new form is chainable with transforms and doesn't require the unnecessary `apikey` query parameter.

**Policy correctness**:

- Drop deprecated `'revoke'` from the policy `call` enum (server alias for `'remove'`, not in the official filestack-js schema).
- Add the `url` policy field — restricts `writeUrl`/`store` to a specific source URL or regex (was previously unreachable).
- Add `'middle'` to the resize `align` values in the transforms manifest.

**Skill content corrections** (factual errors verified against `filestack-api`, `filepicker-webhooks`, `filestack-webhook-consumer`, public docs):

- `filestack-error-diagnosis`: Processing/CDN error format is `{"error": "..."}` — no top-level `result` key.
- `filestack-error-diagnosis`: Filestack does **not** emit `Retry-After` headers. Use `Filestack-Limit` / `Filestack-Remaining` / `Filestack-Reset` (unix timestamp). Upload edge may return `503` on rate-limit, not 429.
- `filestack-webhook-setup`: Removed the bogus `POST api.filestackapi.com/webhooks/<app_id>` curl example — that endpoint is admin-only and not publicly accessible. Webhook registration is done through the Developer Portal UI at <https://dev.filestack.com/>.
- `filestack-webhook-setup`: Note discrepancy between public docs (3 attempts at 5min/30min/12hr) and production retry schedule (5 attempts at 10s/60s/5min/15min/1hr).
- `filestack-sdk-integration`: Added missing `picasa` (legacy) and `clouddrive` (Amazon Cloud Drive) to the documented picker `fromSources` values.

## 1.2.2

- **Security: patch 14 dependency vulnerabilities** (1 critical + 4 high + 9 moderate). Resolves `handlebars` RCE, `fast-uri` ReDoS, `fast-xml-builder`, `file-type`, `follow-redirects`, and others — all transitive deps of the MCP server's npm packages. Run via `npm audit fix` (non-breaking).
- **Build: add missing `esbuild` devDependency** — `npm run bundle` previously failed with `esbuild: command not found` on clean installs.
- **Build: rebuild `mcp/dist/bundle.js`** against patched dependencies.
- Verified end-to-end: all 38 unit tests pass, MCP `initialize` + `tools/list` handshake returns all 10 tools.

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
