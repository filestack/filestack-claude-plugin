# Filestack Plugin for Claude Code & Cursor

Official [Filestack](https://www.filestack.com) plugin for [Claude Code](https://claude.com/claude-code) and [Cursor](https://cursor.com) — the file handling platform-as-a-service for uploads, cloud source ingestion, on-the-fly image/video/document processing, CDN delivery, and policy-based security.

This plugin brings the full Filestack platform into your coding agent through 10 MCP tools, 3 context-aware skills, and a natural language slash command. Upload files, build transformation pipelines, generate signed security policies, set up webhooks, and debug API errors — all through conversation without leaving the terminal.

---

## Table of Contents

- [Supported Platforms](#supported-platforms)
- [Installation](#installation)
- [Configuration](#configuration)
- [MCP Tools](#mcp-tools)
  - [File Operations](#file-operations)
  - [Transformations](#transformations)
  - [Security](#security)
- [Skills](#skills)
  - [filestack-sdk-integration](#filestack-sdk-integration)
  - [filestack-error-diagnosis](#filestack-error-diagnosis)
  - [filestack-webhook-setup](#filestack-webhook-setup)
- [Slash Command](#slash-command)
- [Examples](#examples)
- [Available Transformations](#available-transformations)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [License](#license)

---

## Supported Platforms

This plugin works with both **Claude Code** and **Cursor**. Install it from either marketplace and the correct configuration is detected automatically.

| Platform | Manifest |
|----------|----------|
| Claude Code | `.claude-plugin/plugin.json` |
| Cursor | `.cursor-plugin/plugin.json` |

## Installation

**From marketplace (recommended):**

```text
/plugin marketplace add https://github.com/filestack/filestack-claude-plugin.git
/plugin install filestack-claude-plugin@filestack-plugin
```

The plugin works immediately with a built-in demo API key. For full access to your own Filestack account, set your API key (see [Configuration](#configuration)).

> **Don't have a Filestack account yet?**
> **Sign up free at <https://dev.filestack.com/signup/free/>**

## Configuration

The plugin runs a local MCP server and works out of the box with a demo API key (`APQLlwqrRScGxhw78gs9Wz`). To use your own Filestack account, set your API key as an environment variable before starting your editor:

```bash
export FILESTACK_API_KEY=your_api_key
export FILESTACK_APP_SECRET=your_app_secret  # only needed for security tools
```

You can find your API key and app secret in the [Filestack Developer Portal](https://dev.filestack.com/).

| Variable | Required | Used by |
|----------|----------|---------|
| `FILESTACK_API_KEY` | No (demo key used if unset) | All file operation and transformation tools |
| `FILESTACK_APP_SECRET` | Only for security tools | `filestack_sign_policy`, `filestack_generate_signed_url` |

The MCP server runs locally via Node.js. Policy signing happens on your machine — your app secret never leaves your environment.

---

## MCP Tools

### File Operations

#### `filestack_upload`

Upload a local file or remote URL to Filestack and get a CDN-ready file handle.

```
"Upload ./product-photo.jpg to Filestack"
"Upload https://example.com/image.png to Filestack"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | Yes | Local file path or remote URL |
| `storeOptions` | object | No | Storage options: `location`, `path`, `container`, `access` |

**Returns:** `{ handle, url, filename, size, type }`

#### `filestack_retrieve`

Get metadata for any file handle — size, MIME type, dimensions, upload date, etc.

```
"What's the metadata for file handle abc123XYZ?"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Filestack file handle |

#### `filestack_delete`

Delete a stored file. If your app has security enabled, a policy and signature are required.

```
"Delete file handle abc123XYZ"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Filestack file handle |
| `policy` | string | No | Base64-encoded security policy (if security is enabled) |
| `signature` | string | No | HMAC-SHA256 hex signature (if security is enabled) |

#### `filestack_store_url`

Ingest a remote URL into Filestack storage. The file is fetched server-side — no download needed on your end.

```
"Store https://example.com/document.pdf in Filestack"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceUrl` | string | Yes | Remote URL to store |
| `storeOptions` | object | No | Storage options: `location`, `path`, `container`, `access` |

**Returns:** `{ handle, url, filename, size, type }`

---

### Transformations

#### `filestack_transform_url`

Build a Filestack CDN transformation URL from structured parameters. This is a pure URL construction — no API call, no API key required.

```
"Build a URL that resizes abc123XYZ to 800x600 and converts to webp"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handleOrUrl` | string | Yes | File handle or full CDN URL |
| `transforms` | array | Yes | Array of `{ operation, params }` objects |

**Returns:** The constructed CDN URL, e.g. `https://cdn.filestackcontent.com/resize=width:800,height:600/output=format:webp/abc123XYZ`

#### `filestack_transform_apply`

Apply transformations to a file and persist the result as a new file handle. Unlike `transform_url`, this executes the transformation and stores the output.

```
"Resize abc123XYZ to 400x400, enhance it, and save the result"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handleOrUrl` | string | Yes | File handle or full CDN URL |
| `transforms` | array | Yes | Array of `{ operation, params }` objects |
| `storeOptions` | object | No | Where to store the result |

**Returns:** `{ handle, url }` for the new transformed file

#### `filestack_list_transforms`

List all available transformation operations with their parameters, types, and valid values.

```
"What transformations does Filestack support?"
```

---

### Security

#### `filestack_generate_policy`

Generate a base64-encoded security policy with scoped permissions. Policies control what operations are allowed and for how long.

```
"Generate a read-only policy that expires in 1 hour"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `call` | string or array | Yes | Permission scope(s): `read`, `stat`, `write`, `writeUrl`, `store`, `convert`, `remove`, `revoke`, `pick`, `exif`, `runWorkflow` |
| `expiry` | number | Yes | Unix timestamp (seconds) when the policy expires |
| `handle` | string | No | Restrict to a specific file handle |
| `path` | string | No | Restrict to a path prefix |
| `container` | string | No | Restrict to a storage container |
| `minSize` | number | No | Minimum file size in bytes |
| `maxSize` | number | No | Maximum file size in bytes |

#### `filestack_sign_policy`

Sign a base64-encoded policy with HMAC-SHA256 using your app secret. The signing happens locally — your secret never leaves your machine.

```
"Sign this policy: eyJjYWxsIjpbInJlYWQiXX0"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policy` | string | Yes | Base64-encoded policy from `filestack_generate_policy` |

**Requires:** `FILESTACK_APP_SECRET` environment variable

#### `filestack_generate_signed_url`

One-step convenience tool: generates a policy, signs it, and returns a fully signed CDN URL ready to use.

```
"Give me a signed URL for handle XYZ123 with read access, valid for 2 hours"
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Filestack file handle |
| `call` | string or array | Yes | Permission scope(s) |
| `expiry` | number | Yes | Unix timestamp (seconds) |
| `container` | string | No | Restrict to container |
| `path` | string | No | Restrict to path prefix |
| `minSize` | number | No | Minimum file size in bytes |
| `maxSize` | number | No | Maximum file size in bytes |

**Returns:** `{ policy, signature, signedUrl }`

**Requires:** Both `FILESTACK_API_KEY` and `FILESTACK_APP_SECRET` environment variables

---

## Skills

Skills activate automatically based on conversation context. They provide Claude with domain-specific knowledge about Filestack patterns, best practices, and debugging techniques.

### filestack-sdk-integration

**Activates when:** You import Filestack SDKs (`filestack-js`, `from filestack import`), use SDK methods (`client.picker(`, `client.upload(`), reference picker config options (`fromSources`, `storeTo`, `acceptedFileTypes`), or ask how to add file upload to your app.

**Provides:**
- SDK initialization for JavaScript/TypeScript and Python
- CDN loader setup (no bundler required)
- Picker widget configuration — accepted file types, cloud sources, storage options, size limits
- Upload response shape and TypeScript interfaces
- Framework-specific patterns for React and Next.js
- Common mistakes: wrong API key scope, missing CORS whitelist, transform chain ordering, unawaited upload promises

### filestack-error-diagnosis

**Activates when:** You encounter Filestack API errors — HTTP 401/403/404/429, domain tokens (`filestackapi.com`, `filestackcontent.com`), error response shapes (`{"result": "error"}`, `{"error": ..., "result": null}`), or paste a Filestack error message.

**Provides:**
- HTTP error code reference with likely causes and fixes
- Security policy error breakdown (expired policy, wrong signature, insufficient scope, CORS origin)
- Transformation error table (unsupported format, size limit, timeout, invalid parameter)
- Step-by-step diagnosis checklist: API key validation, policy expiry check, handle existence, CORS whitelist, transform parameter verification, rate limit detection

### filestack-webhook-setup

**Activates when:** You work with Filestack webhook headers (`FS-Signature`, `FS-Timestamp`), event types (`fp.upload`, `fp.converse`, `fp.delete`, `fp.video_converse`, `fp.scan`), or ask about Filestack event notifications.

**Provides:**
- Complete webhook event type reference with trigger conditions
- Webhook registration API with curl examples
- Webhook payload shape documentation
- HMAC-SHA256 signature verification code in three languages:
  - **Node.js/TypeScript** — Express handler with raw body capture
  - **Python** — Flask handler with `hmac.compare_digest`
  - **Go** — Standard library verification function
- Critical production patterns: return 200 before processing, idempotency via event ID, raw body preservation for signature verification, retry behavior (5 retries with exponential backoff: 10s, 60s, 5min, 15min, 1hr)

---

## Slash Command

### `/filestack-transform`

Convert plain-English descriptions into Filestack CDN transformation URLs.

```
/filestack-transform <handle-or-url> <description>
```

**Examples:**

```
/filestack-transform abc123XYZ resize to 800x600 and convert to webp
-> https://cdn.filestackcontent.com/resize=width:800,height:600/output=format:webp/abc123XYZ

/filestack-transform abc123XYZ detect face, enhance, and convert to jpg at 85 quality
-> https://cdn.filestackcontent.com/crop_faces=faces:1/enhance/output=format:jpg,quality:85/abc123XYZ

/filestack-transform https://cdn.filestackcontent.com/abc123XYZ rotate 90 and monochrome
-> https://cdn.filestackcontent.com/rotate=deg:90/monochrome/abc123XYZ
```

Accepts bare handles or full CDN URLs. If called with no arguments, shows usage and examples.

---

## Examples

### Upload a file and get a CDN URL

> "Upload ./hero-banner.jpg to Filestack"

Claude calls `filestack_upload` and returns:
```json
{
  "handle": "abc123XYZ",
  "url": "https://cdn.filestackcontent.com/abc123XYZ",
  "filename": "hero-banner.jpg",
  "size": 245760,
  "type": "image/jpeg"
}
```

### Build an image processing pipeline

> "Take handle abc123XYZ, crop to the detected face, resize to 400x400, enhance colors, and output as webp"

Claude calls `filestack_transform_url` and returns:
```
https://cdn.filestackcontent.com/crop_faces=faces:1/resize=width:400,height:400,fit:crop/enhance/output=format:webp/abc123XYZ
```

### Generate a time-limited signed URL

> "I need a signed URL for handle XYZ123 that allows read access for 2 hours"

Claude calls `filestack_generate_signed_url` and returns a policy, signature, and ready-to-use URL in the canonical Filestack path-based form (chainable with transforms):
```
https://cdn.filestackcontent.com/security=policy:eyJ...,signature:a1b2c3.../XYZ123
```

### Debug a 403 error

> "I'm getting `{"result": "error", "error": {"code": 403, "msg": "Policy required"}}` from the v1 API"

Claude activates the `filestack-error-diagnosis` skill and walks through: Is security enabled on your app? Is the policy expired? Does the policy include `read` scope? Is your CORS origin whitelisted?

### Add file upload to a React app

> "Add image upload to my React app with Google Drive and Dropbox support"

Claude activates `filestack-sdk-integration` and generates a complete React component with the Filestack picker configured for the specified cloud sources, file type restrictions, and upload callbacks.

### Set up webhook verification

> "I need a Node.js endpoint to receive Filestack upload events with signature verification"

Claude activates `filestack-webhook-setup` and provides a production-ready Express handler with HMAC-SHA256 verification, raw body capture, immediate acknowledgment, and async processing.

### Ingest files from external URLs

> "Store these S3 URLs in Filestack so I can use the transformation CDN"

Claude calls `filestack_store_url` for each URL, returning handles that work with the full transformation and delivery pipeline — no download-then-reupload needed.

---

## Available Transformations

The following transformations can be used with `filestack_transform_url`, `filestack_transform_apply`, and `/filestack-transform`:

| Transform | Description | Key Parameters |
|-----------|-------------|----------------|
| `resize` | Resize an image | `width`, `height`, `fit` (clip/crop/scale/max), `align` |
| `crop` | Crop to specific dimensions | `dim` as [x, y, width, height] |
| `crop_faces` | Detect faces and crop to them | `faces` (count), `buffer` (padding %) |
| `rotate` | Rotate an image | `deg` (0-359), `background` (hex color) |
| `flip` | Flip vertically | — |
| `flop` | Flip horizontally | — |
| `enhance` | Auto-enhance image quality | — |
| `monochrome` | Convert to grayscale | — |
| `sepia` | Apply sepia tone | `tone` (0-100) |
| `blur` | Blur image | `amount` (1-20) |
| `sharpen` | Sharpen image | `amount` (1-20) |
| `compress` | Compress image | `metadata` (preserve metadata) |
| `watermark` | Add watermark overlay | `file` (watermark handle), `size` (%), `position` |
| `output` | Convert format | `format` (jpg/png/webp/gif/pdf/svg), `quality` (1-100) |

Transforms are chained left-to-right in the CDN URL. Put processing operations (resize, crop, enhance) before format conversion (output).

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Tools return placeholder key warning | Set `FILESTACK_API_KEY` environment variable and restart your editor |
| Security tools return "App secret not configured" | Set `FILESTACK_APP_SECRET` environment variable and restart your editor |
| Skills not appearing after install | Restart your editor — skills load at session start |
| `filestack_upload` fails for local files | Ensure the file path is absolute or relative to the working directory |
| `filestack_transform_apply` returns 403 | Your account may not have processing permissions — check the Filestack Developer Portal |
| Signed URLs return 403 | Verify the policy hasn't expired and includes the correct `call` scope for the operation |

---

## Documentation

- [Filestack Documentation](https://www.filestack.com/docs/)
- [Processing API Reference](https://www.filestack.com/docs/api/processing/)
- [Security Policies Guide](https://www.filestack.com/docs/security/policies/)
- [Webhooks Guide](https://www.filestack.com/docs/webhooks/)
- [JavaScript SDK Reference](https://www.filestack.com/docs/sdks/javascript/)
- [Filestack Developer Portal](https://dev.filestack.com/)

## License

MIT
