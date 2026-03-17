# Filestack Claude Code Plugin

Official Claude Code plugin for [Filestack](https://www.filestack.com) — upload files, build transformations, and generate security policies directly from Claude Code.

## Install

**From marketplace:**

```
/plugin marketplace add filestack/filestack-claude-plugin
```

**Manual:**

Clone the repo and install:

```bash
git clone https://github.com/filestack/filestack-claude-plugin.git
cd filestack-claude-plugin/mcp && npm install && npm run build
```

## Configuration

Set these environment variables before starting Claude Code:

```bash
export FILESTACK_API_KEY=your_api_key
export FILESTACK_APP_SECRET=your_app_secret  # only needed for security tools
```

## MCP Tools

| Tool | Description |
| --- | --- |
| `filestack_upload` | Upload a local file or remote URL to Filestack |
| `filestack_retrieve` | Retrieve metadata for a file handle |
| `filestack_delete` | Delete a stored file by handle |
| `filestack_store_url` | Store a remote URL and return a file handle |
| `filestack_transform_url` | Build a CDN transformation URL (pure, no API call) |
| `filestack_transform_apply` | Apply transformations and store the result |
| `filestack_list_transforms` | List available transformation operations |
| `filestack_generate_policy` | Generate a base64-encoded security policy |
| `filestack_sign_policy` | Sign a policy with HMAC-SHA256 |
| `filestack_generate_signed_url` | Generate a fully signed CDN URL in one step |

## Skills

| Skill | Triggers on |
| --- | --- |
| **sdk-integration** | `filestack-js`, `client.picker(`, `from filestack import`, `storeTo`, `fromSources` |
| **webhook-setup** | `FS-Signature`, `fp.upload`, `fp.converse`, `filestack_webhook` |
| **error-diagnosis** | `filestackapi.com` errors, HTTP 401/403/404/429, `result: null` |

## Command

```
/filestack-transform <handle-or-url> <description>
```

Examples:

```text
/filestack-transform abc123 resize to 800x600 and convert to webp
/filestack-transform abc123 detect face, enhance, convert to jpg at 85 quality
```

## Remote MCP (optional)

Replace `.mcp.json` with:

```json
{
  "filestack": {
    "type": "http",
    "url": "https://mcp.filestack.com/mcp",
    "headers": { "Authorization": "Bearer ${FILESTACK_API_KEY}" }
  }
}
```

## Documentation

- [Filestack Docs](https://www.filestack.com/docs/)
- [Processing API](https://www.filestack.com/docs/api/processing/)
- [Security Policies](https://www.filestack.com/docs/security/policies/)
- [Webhooks](https://www.filestack.com/docs/webhooks/)

## License

MIT
