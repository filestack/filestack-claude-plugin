#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { filestackUpload, filestackRetrieve, filestackDelete, filestackStoreUrl } from './tools/files';
import { filestackTransformUrl, filestackTransformApply, filestackListTransforms } from './tools/transform';
import {
  filestackGeneratePolicy,
  filestackSignPolicy,
  filestackGenerateSignedUrl,
} from './tools/security';
import { toolError, PLACEHOLDER_WARNING } from './types';
import { isPlaceholderKey } from './auth';

const TOOLS: Tool[] = [
  {
    name: 'filestack_upload',
    description: 'Upload a local file or remote URL to Filestack and return a file handle',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Local file path or remote URL to upload' },
        storeOptions: { type: 'object', description: 'Optional storage options (location, path, container, access)' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'filestack_retrieve',
    description: 'Retrieve metadata for a Filestack file handle',
    inputSchema: {
      type: 'object',
      properties: { handle: { type: 'string', description: 'Filestack file handle' } },
      required: ['handle'],
    },
  },
  {
    name: 'filestack_delete',
    description: 'Delete a stored file by handle (policy + signature required if app security is enabled)',
    inputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        policy: { type: 'string', description: 'Base64-encoded security policy (if required)' },
        signature: { type: 'string', description: 'HMAC-SHA256 hex signature (if required)' },
      },
      required: ['handle'],
    },
  },
  {
    name: 'filestack_store_url',
    description: 'Store a remote URL to Filestack and return a file handle',
    inputSchema: {
      type: 'object',
      properties: {
        sourceUrl: { type: 'string', description: 'Remote URL to store' },
        storeOptions: { type: 'object' },
      },
      required: ['sourceUrl'],
    },
  },
  {
    name: 'filestack_transform_url',
    description: 'Build a Filestack CDN transformation URL (pure — no API call, no key required)',
    inputSchema: {
      type: 'object',
      properties: {
        handleOrUrl: { type: 'string', description: 'File handle or full CDN URL' },
        transforms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              operation: { type: 'string' },
              params: { type: 'object' },
            },
            required: ['operation'],
          },
        },
      },
      required: ['handleOrUrl', 'transforms'],
    },
  },
  {
    name: 'filestack_transform_apply',
    description: 'Apply transformations to a file and store the result, returning a new handle',
    inputSchema: {
      type: 'object',
      properties: {
        handleOrUrl: { type: 'string' },
        transforms: { type: 'array', items: { type: 'object' } },
        storeOptions: { type: 'object' },
      },
      required: ['handleOrUrl', 'transforms'],
    },
  },
  {
    name: 'filestack_list_transforms',
    description: 'List all available Filestack transformation operations with their parameters',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'filestack_generate_policy',
    description: 'Generate a base64-encoded Filestack security policy',
    inputSchema: {
      type: 'object',
      properties: {
        call: {
          description: 'Permission(s) to grant. Valid values: read, stat, write, writeUrl, store, convert, remove, revoke, pick, exif, runWorkflow',
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        expiry: { type: 'number', description: 'Unix timestamp (seconds) when the policy expires' },
        handle: { type: 'string', description: 'Restrict policy to a specific file handle' },
        path: { type: 'string', description: 'Restrict policy to a path prefix' },
        container: { type: 'string', description: 'Restrict policy to a storage container' },
        minSize: { type: 'number', description: 'Minimum file size in bytes' },
        maxSize: { type: 'number', description: 'Maximum file size in bytes' },
      },
      required: ['call', 'expiry'],
    },
  },
  {
    name: 'filestack_sign_policy',
    description: 'Sign a base64-encoded policy with HMAC-SHA256 using FILESTACK_APP_SECRET from env',
    inputSchema: {
      type: 'object',
      properties: { policy: { type: 'string', description: 'Base64-encoded policy from filestack_generate_policy' } },
      required: ['policy'],
    },
  },
  {
    name: 'filestack_generate_signed_url',
    description: 'Generate a policy, sign it, and return a fully signed CDN URL in one step',
    inputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        call: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
        expiry: { type: 'number' },
        container: { type: 'string' },
        path: { type: 'string' },
        minSize: { type: 'number' },
        maxSize: { type: 'number' },
      },
      required: ['handle', 'call', 'expiry'],
    },
  },
];

const server = new Server(
  { name: 'filestack-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  let result: unknown;

  try {
    switch (name) {
      case 'filestack_upload':
        result = await filestackUpload(a.filePath as string, a.storeOptions as Record<string, unknown>);
        break;
      case 'filestack_retrieve':
        result = await filestackRetrieve(a.handle as string);
        break;
      case 'filestack_delete':
        result = await filestackDelete(a.handle as string, a.policy as string, a.signature as string);
        break;
      case 'filestack_store_url':
        result = await filestackStoreUrl(a.sourceUrl as string, a.storeOptions as Record<string, unknown>);
        break;
      case 'filestack_transform_url':
        result = filestackTransformUrl(a.handleOrUrl as string, a.transforms as Parameters<typeof filestackTransformUrl>[1]);
        break;
      case 'filestack_transform_apply':
        result = await filestackTransformApply(a.handleOrUrl as string, a.transforms as Parameters<typeof filestackTransformApply>[1], a.storeOptions as Record<string, unknown>);
        break;
      case 'filestack_list_transforms':
        result = filestackListTransforms();
        break;
      case 'filestack_generate_policy':
        result = filestackGeneratePolicy(a as unknown as Parameters<typeof filestackGeneratePolicy>[0]);
        break;
      case 'filestack_sign_policy':
        result = filestackSignPolicy(a.policy as string);
        break;
      case 'filestack_generate_signed_url':
        result = filestackGenerateSignedUrl(a.handle as string, a as unknown as Parameters<typeof filestackGenerateSignedUrl>[1]);
        break;
      default:
        result = toolError('unknown_tool', `Unknown tool: ${name}`);
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    result = toolError('internal', e.message ?? 'Unexpected error');
  }

  const content: Array<{ type: 'text'; text: string }> = [];

  if (isPlaceholderKey()) {
    content.push({ type: 'text', text: PLACEHOLDER_WARNING });
  }

  content.push({ type: 'text', text: JSON.stringify(result) });

  return { content };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
