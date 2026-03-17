# Filestack Claude Code Plugin

Official Claude Code plugin for [Filestack](https://www.filestack.com).

## Install

```
/plugin marketplace add filestack/filestack-claude-plugin
/plugin install filestack
```

## Configuration

Set these environment variables before starting Claude Code:

```bash
export FILESTACK_API_KEY=your_api_key
export FILESTACK_APP_SECRET=your_app_secret  # only needed for security tools
```

## What's included

- **MCP Tools** — 10 tools for file operations, transformations, and security policies
- **Skills** — auto-triggered guidance for SDK integration, webhook setup, and error diagnosis
- **Command** — `/filestack-transform` for building CDN transformation URLs

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
