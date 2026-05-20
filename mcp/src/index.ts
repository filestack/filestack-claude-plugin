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
import { filestackAnalyze } from './tools/intelligence';
import { filestackConvertDocument } from './tools/document';
import { filestackConvertVideo, filestackVideoStatus } from './tools/video';
import { filestackZipFiles } from './tools/archive';
import { filestackScreenshotUrl } from './tools/capture';
import { filestackRunWorkflow } from './tools/workflow';
import { filestackVerifyWebhookSignature, filestackSignWebhookPayload } from './tools/webhook';
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
          description: 'Permission(s) to grant. Valid values: pick, read, stat, write, writeUrl, store, convert, remove, exif, runWorkflow',
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        expiry: { type: 'number', description: 'Unix timestamp (seconds) when the policy expires' },
        handle: { type: 'string', description: 'Restrict policy to a specific file handle' },
        url: { type: 'string', description: 'Restrict writeUrl/store to a specific source URL or regex' },
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
        url: { type: 'string', description: 'Restrict writeUrl/store to a specific source URL or regex' },
        container: { type: 'string' },
        path: { type: 'string' },
        minSize: { type: 'number' },
        maxSize: { type: 'number' },
      },
      required: ['handle', 'call', 'expiry'],
    },
  },
  {
    name: 'filestack_analyze',
    description: 'Run a Filestack intelligence (AI/ML) task: tags, sfw, caption, ocr, copyright, image_sentiment, doc_detection, or text_sentiment. Returns task-specific JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          enum: ['tags', 'sfw', 'caption', 'ocr', 'copyright', 'image_sentiment', 'doc_detection', 'text_sentiment'],
          description: 'Which intelligence task to run',
        },
        handleOrText: {
          type: 'string',
          description: 'File handle for file-based tasks; raw text for text_sentiment',
        },
        options: {
          type: 'object',
          description: 'Task-specific options: doc_detection (coords, preprocess); text_sentiment (text, language)',
        },
      },
      required: ['task', 'handleOrText'],
    },
  },
  {
    name: 'filestack_convert_document',
    description: 'Convert documents between formats (DOC/DOCX/PPT/XLSX/ODT/HTML/etc. -> PDF/image/other) via Filestack output transform. Returns the CDN URL of the converted file.',
    inputSchema: {
      type: 'object',
      properties: {
        handleOrUrl: { type: 'string', description: 'Source file handle or external URL' },
        format: {
          type: 'string',
          enum: ['pdf', 'doc', 'docx', 'odt', 'ppt', 'pptx', 'odp', 'xls', 'xlsx', 'ods', 'html', 'txt', 'jpg', 'pjpg', 'png', 'webp', 'svg'],
          description: 'Target format',
        },
        options: {
          type: 'object',
          description: 'Optional: page (PDF page to extract), density (DPI), quality, pageformat (a4/letter/etc.), pageorientation, secure',
        },
      },
      required: ['handleOrUrl', 'format'],
    },
  },
  {
    name: 'filestack_convert_video',
    description: 'Submit a video transcode job (async, Telestream-backed). Returns a UUID and status_url. Use filestack_video_status to poll, or configure a webhook for the fp.video_converse event.',
    inputSchema: {
      type: 'object',
      properties: {
        handleOrUrl: { type: 'string' },
        preset: { type: 'string', description: 'Output preset: h264, hls, dash, mp3, mp4, m4a, webm, etc.' },
        options: {
          type: 'object',
          description: 'Optional encoding params: width, height, fps, video_bitrate, audio_bitrate, force, clip_offset, clip_length, email, watermark_url, etc.',
        },
      },
      required: ['handleOrUrl', 'preset'],
    },
  },
  {
    name: 'filestack_video_status',
    description: 'Poll the status of a previously submitted video conversion job by UUID.',
    inputSchema: {
      type: 'object',
      properties: { uuid: { type: 'string', description: 'UUID returned by filestack_convert_video' } },
      required: ['uuid'],
    },
  },
  {
    name: 'filestack_zip_files',
    description: 'Build a CDN URL that bundles a list of file handles into a single ZIP archive. Pure URL construction — no API call until the URL is fetched.',
    inputSchema: {
      type: 'object',
      properties: {
        handles: {
          type: 'array',
          items: { type: 'string' },
          description: 'File handles to bundle (max 100)',
        },
      },
      required: ['handles'],
    },
  },
  {
    name: 'filestack_screenshot_url',
    description: 'Build a CDN URL that captures a screenshot of a target web page. Pure URL construction.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUrl: { type: 'string', description: 'Full http(s) URL to capture' },
        options: {
          type: 'object',
          description: 'Optional: agent (desktop/mobile), mode (all/window), width, height, delay (ms), orientation (portrait/landscape), device (mobile profile)',
        },
      },
      required: ['targetUrl'],
    },
  },
  {
    name: 'filestack_run_workflow',
    description: 'Run a saved Filestack Workflow against a file handle or URL. Workflows are designed in dev.filestack.com -> Workflows and identified by UUID. Required policy calls: convert, runWorkflow.',
    inputSchema: {
      type: 'object',
      properties: {
        handleOrUrl: { type: 'string' },
        workflowId: { type: 'string', description: 'Workflow UUID from dev.filestack.com -> Workflows' },
        options: {
          type: 'object',
          description: 'For security-enabled apps: { policy, signature }. Policies must include both convert and runWorkflow calls.',
        },
      },
      required: ['handleOrUrl', 'workflowId'],
    },
  },
  {
    name: 'filestack_verify_webhook_signature',
    description: 'Verify a Filestack webhook HMAC-SHA256 signature locally — no network call. Returns { valid, expected }. Use to authenticate incoming webhook requests in your receiver.',
    inputSchema: {
      type: 'object',
      properties: {
        rawBody: { type: 'string', description: 'Raw request body (exact bytes, before any JSON parsing)' },
        fsSignature: { type: 'string', description: 'FS-Signature header value' },
        fsTimestamp: { type: 'string', description: 'FS-Timestamp header value' },
        webhookSecret: { type: 'string', description: 'Per-webhook secret from dev.filestack.com' },
      },
      required: ['rawBody', 'fsSignature', 'fsTimestamp', 'webhookSecret'],
    },
  },
  {
    name: 'filestack_sign_webhook_payload',
    description: 'Generate FS-Signature and FS-Timestamp headers for a webhook body (for testing your own webhook receiver locally).',
    inputSchema: {
      type: 'object',
      properties: {
        body: { type: 'string', description: 'Raw JSON body string' },
        webhookSecret: { type: 'string' },
        timestamp: { type: 'number', description: 'Optional unix timestamp; defaults to now' },
      },
      required: ['body', 'webhookSecret'],
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
      case 'filestack_analyze':
        result = await filestackAnalyze(
          a.task as string,
          a.handleOrText as string,
          a.options as Parameters<typeof filestackAnalyze>[2],
        );
        break;
      case 'filestack_convert_document':
        result = await filestackConvertDocument(
          a.handleOrUrl as string,
          a.format as string,
          a.options as Parameters<typeof filestackConvertDocument>[2],
        );
        break;
      case 'filestack_convert_video':
        result = await filestackConvertVideo(
          a.handleOrUrl as string,
          a.preset as string,
          a.options as Parameters<typeof filestackConvertVideo>[2],
        );
        break;
      case 'filestack_video_status':
        result = await filestackVideoStatus(a.uuid as string);
        break;
      case 'filestack_zip_files':
        result = filestackZipFiles(a.handles as string[]);
        break;
      case 'filestack_screenshot_url':
        result = filestackScreenshotUrl(
          a.targetUrl as string,
          a.options as Parameters<typeof filestackScreenshotUrl>[1],
        );
        break;
      case 'filestack_run_workflow':
        result = await filestackRunWorkflow(
          a.handleOrUrl as string,
          a.workflowId as string,
          a.options as Parameters<typeof filestackRunWorkflow>[2],
        );
        break;
      case 'filestack_verify_webhook_signature':
        result = filestackVerifyWebhookSignature(
          a.rawBody as string,
          a.fsSignature as string,
          a.fsTimestamp as string,
          a.webhookSecret as string,
        );
        break;
      case 'filestack_sign_webhook_payload':
        result = filestackSignWebhookPayload(
          a.body as string,
          a.webhookSecret as string,
          a.timestamp as number | undefined,
        );
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
