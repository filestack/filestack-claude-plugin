# Filestack Plugin for Claude Code & Cursor

**Repository:** https://github.com/filestack/filestack-claude-plugin
**Publisher:** Filestack (https://www.filestack.com)
**License:** MIT

---

## What It Does

The Filestack plugin gives Claude Code and Cursor native access to the Filestack file handling platform. Developers can upload files, build image/video transformation pipelines, generate security policies, and debug integration issues — all through natural language conversation without leaving their editor.

Filestack handles file infrastructure for thousands of applications: uploads, cloud source ingestion (Google Drive, Dropbox, etc.), on-the-fly image/video/document processing via CDN, and policy-based security. This plugin bridges that platform directly into your coding agent workflow.

**Authentication:** On first use, you'll be prompted to log in with your Filestack account via OAuth2. No API keys to copy, no environment variables to configure — just approve the login and start using the tools.

---

## Plugin Components

### MCP Server (10 tools)

The plugin ships an MCP server (`@filestack/mcp`) that exposes Filestack's API as tool calls:

| Tool | What it does |
|------|-------------|
| `filestack_upload` | Upload a local file or remote URL to Filestack, returns a CDN-ready handle |
| `filestack_retrieve` | Get metadata for any file handle (size, MIME type, dimensions, etc.) |
| `filestack_delete` | Delete a stored file (supports signed deletion for security-enabled apps) |
| `filestack_store_url` | Ingest a remote URL into Filestack storage |
| `filestack_transform_url` | Build a CDN transformation URL from structured parameters (pure, no API call) |
| `filestack_transform_apply` | Apply transformations and persist the result as a new file handle |
| `filestack_list_transforms` | List all available transformation operations with parameters |
| `filestack_generate_policy` | Generate a base64-encoded security policy with scoped permissions |
| `filestack_sign_policy` | HMAC-SHA256 sign a policy using the app secret |
| `filestack_generate_signed_url` | One-step: generate policy + sign + build a fully signed CDN URL |

### Skills (3)

| Skill | When it activates | What it provides |
|-------|-------------------|------------------|
| `filestack-sdk-integration` | User imports `filestack-js`, uses `client.picker(`, `from filestack import`, or asks how to add file upload | SDK initialization patterns, picker widget configuration, upload flows, framework-specific examples (React, Next.js), common mistake warnings |
| `filestack-error-diagnosis` | User encounters Filestack API errors (401/403/404/429), domain tokens like `filestackapi.com`, or error shapes like `{"result": "error"}` | HTTP error code reference, security policy debugging checklist, transformation error table, step-by-step diagnosis flow |
| `filestack-webhook-setup` | User works with `FS-Signature`, `fp.upload` events, or asks about Filestack notifications | Event type reference, webhook registration API, HMAC-SHA256 signature verification code (Node.js, Python, Go), idempotency and async processing patterns |

### Slash Command (1)

| Command | What it does |
|---------|-------------|
| `/filestack-transform` | Natural language to CDN URL — describe what you want ("resize to 800x600 and convert to webp") and get a working transformation URL |

---

## Use Cases

### 1. Add file upload to a web app in one conversation

> **User:** "I need to add image upload to my React app. Users should be able to pick files from their computer or Google Drive, max 5 files, max 10MB each, images only."

Claude activates the `filestack-sdk-integration` skill and generates a complete React component with the Filestack picker configured for the exact requirements — accepted file types, source restrictions, size limits, and upload callback handling. The user gets working code, not boilerplate.

---

### 2. Build an image processing pipeline interactively

> **User:** "I have a product photo at handle abc123XYZ. I need a 400x400 thumbnail with face detection crop, enhanced colors, and output as webp."

Claude chains the `filestack_transform_url` tool to build the CDN URL:
```
https://cdn.filestackcontent.com/crop_faces=faces:1/resize=width:400,height:400,fit:crop/enhance/output=format:webp/abc123XYZ
```

If the user wants to persist the result, Claude calls `filestack_transform_apply` to store it as a new handle. No code to write — the CDN does the processing.

---

### 3. Debug a 403 error in production

> **User:** "My app is getting 403 errors when trying to display images through the Filestack CDN. Here's the error: `{"result": "error", "error": {"code": 403, "msg": "Policy required"}}`"

Claude activates `filestack-error-diagnosis` and walks through the checklist: Is the API key valid? Is security enabled on the app? Is the policy expired? Does the policy include `read` scope? Is the CORS origin whitelisted? — each with the specific API calls or dashboard steps to verify.

---

### 4. Generate secure, scoped access URLs

> **User:** "I need a signed URL that lets a user download file handle XYZ123 for the next 2 hours, but nothing else."

Claude calls `filestack_generate_signed_url` with `handle: "XYZ123"`, `call: "read"`, and `expiry` set to 2 hours from now. Returns the policy, signature, and ready-to-use signed CDN URL — no manual base64 encoding or HMAC computation needed.

---

### 5. Set up webhook signature verification

> **User:** "I'm building a Node.js endpoint to receive Filestack upload notifications. How do I verify the webhook signature?"

Claude activates `filestack-webhook-setup` and provides the complete Express handler with HMAC-SHA256 verification using `FS-Signature` and `FS-Timestamp` headers, raw body capture, immediate 200 response before async processing, and idempotency key usage — all the patterns needed for production-grade webhook handling.

---

### 6. Natural language transformation via slash command

> **User:** `/filestack-transform abc123XYZ make it grayscale, rotate 90 degrees, and save as png`

Claude maps the plain-English description to Filestack CDN URL syntax:
```
https://cdn.filestackcontent.com/monochrome/rotate=deg:90/output=format:png/abc123XYZ
```

The command handles any combination of Filestack's ~20 transform operations with parameter inference from natural language.

---

### 7. Bulk file operations during development

> **User:** "Upload all the sample images in ./test-fixtures/ to Filestack and give me the handles."

Claude iterates through the directory, calls `filestack_upload` for each file, and returns a table of filenames mapped to handles and CDN URLs — useful for seeding test data, populating CMS content, or migrating assets.

---

### 8. Migrate from another file service

> **User:** "I have 50 images hosted on S3 at these URLs. Store them all in Filestack so I can use the transformation CDN."

Claude uses `filestack_store_url` for each URL to ingest them into Filestack, returning handles that work with the entire transformation and delivery pipeline. No download-then-reupload needed.

---

## Installation

```text
/plugin marketplace add https://github.com/filestack/filestack-claude-plugin.git
/plugin install filestack-claude-plugin@filestack-plugin
```

On first use, approve the OAuth2 login prompt to connect your Filestack account. No API keys or environment variables needed.

---

## Why This Plugin Exists

File handling is infrastructure that every application needs but nobody wants to build from scratch — upload widgets, multipart upload orchestration, image resizing, format conversion, virus scanning, CDN delivery, signed URLs, webhook verification. Filestack abstracts all of that behind an API.

This plugin makes that API conversational. Instead of reading docs to figure out CDN URL syntax or HMAC signing, developers describe what they want and Claude does the rest — with the full context of Filestack's capabilities available through skills, tools, and commands.

---

## Technical Details

- **Platforms:** Claude Code and Cursor
- **Auth:** OAuth2 via Filestack-hosted MCP servers (default); environment variables for local mode
- **MCP servers:** Three remote servers (`filestack-files`, `filestack-transforms`, `filestack-security`) with OAuth2
- **Local mode:** TypeScript MCP server via `npx -y @filestack/mcp@latest` with stdio transport
- **Dependencies:** `@modelcontextprotocol/sdk`, `filestack-js`, `node-fetch`
- **No state:** All tools are stateless; no local database or cache
