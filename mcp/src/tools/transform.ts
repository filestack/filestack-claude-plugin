import fetch from 'node-fetch';
import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';
import manifest from './transforms-manifest.json';

const CDN_BASE = 'https://cdn.filestackcontent.com';
const PROCESS_BASE = 'https://process.filestackapi.com';

export interface Transform {
  operation: string;
  params?: Record<string, string | number | boolean>;
}

function extractHandle(handleOrUrl: string): string {
  // Accept bare handle or full CDN URL
  if (handleOrUrl.startsWith('https://cdn.filestackcontent.com/')) {
    const parts = handleOrUrl.split('/');
    return parts[parts.length - 1];
  }
  return handleOrUrl;
}

function buildTransformSegment(t: Transform): string {
  if (!t.params || Object.keys(t.params).length === 0) {
    return t.operation;
  }
  const paramStr = Object.entries(t.params)
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  return `${t.operation}=${paramStr}`;
}

export function filestackTransformUrl(
  handleOrUrl: string,
  transforms: Transform[]
): ToolResult<string> {
  const handle = extractHandle(handleOrUrl);
  if (!handle) {
    return toolError('invalid_input', 'handle or URL is required');
  }
  const segments = transforms.map(buildTransformSegment);
  const url = `${CDN_BASE}/${segments.join('/')}/${handle}`;
  return success(url);
}

export async function filestackTransformApply(
  handleOrUrl: string,
  transforms: Transform[],
  storeOptions?: Record<string, unknown>
): Promise<ToolResult<{ handle: string; url: string }>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  const handle = extractHandle(handleOrUrl);
  const segments = transforms.map(buildTransformSegment);

  const storeSegment = storeOptions
    ? `store=${Object.entries(storeOptions).map(([k, v]) => `${k}:${v}`).join(',')}`
    : 'store';

  try {
    const res = await fetch(
      `${PROCESS_BASE}/${apiKey}/${segments.join('/')}/${storeSegment}/${handle}`,
      { method: 'GET' }
    );

    if (!res.ok) {
      const text = await res.text();
      return toolError(res.status, text || res.statusText);
    }
    const data = await res.json() as { handle: string; url: string };
    return success(data);
  } catch (err: unknown) {
    const e = err as { message?: string };
    return toolError(500, `Network error: ${e.message ?? 'Request failed'}`);
  }
}

export function filestackListTransforms(): ToolResult<typeof manifest.transforms> {
  return success(manifest.transforms);
}
