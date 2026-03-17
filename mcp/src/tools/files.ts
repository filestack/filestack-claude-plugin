import fetch from 'node-fetch';
import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';

// Public docs use www.filestackapi.com; api.filestackapi.com also works (same backend)
const API_BASE = 'https://www.filestackapi.com/api';
const STORE_BASE = 'https://www.filestackapi.com/api/store/S3';

export interface FileResult {
  handle: string;
  url: string;
  filename: string;
  size?: number;
  type?: string; // MIME type — raw API returns 'type', not 'mimetype'
}

export async function filestackUpload(
  filePath: string,
  storeOptions?: Record<string, unknown>
): Promise<ToolResult<FileResult>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  // URL-based upload
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filestackStoreUrl(filePath, storeOptions);
  }

  // Local file upload via filestack-js
  try {
    const { init } = await import('filestack-js');
    const client = init(apiKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await client.upload(filePath, {}, storeOptions as any);
    return success({
      handle: res.handle,
      url: res.url,
      filename: res.filename,
      size: res.size,
      type: res.type,
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return toolError(e.status ?? 500, e.message ?? 'Upload failed');
  }
}

export async function filestackRetrieve(
  handle: string
): Promise<ToolResult<Record<string, unknown>>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  const res = await fetch(`${API_BASE}/file/${handle}/metadata?key=${apiKey}`);
  if (!res.ok) {
    const text = await res.text();
    return toolError(res.status, text || res.statusText);
  }
  const data = await res.json() as Record<string, unknown>;
  return success(data);
}

export async function filestackDelete(
  handle: string,
  policy?: string,
  signature?: string
): Promise<ToolResult<{ status: string }>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  let url = `${API_BASE}/file/${handle}?key=${apiKey}`;
  if (policy) url += `&policy=${policy}`;
  if (signature) url += `&signature=${signature}`;

  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    return toolError(res.status, text || res.statusText);
  }
  return success({ status: 'ok' });
}

export async function filestackStoreUrl(
  sourceUrl: string,
  storeOptions?: Record<string, unknown>
): Promise<ToolResult<FileResult>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  const body: Record<string, unknown> = { url: sourceUrl, ...storeOptions };
  const res = await fetch(`${STORE_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return toolError(res.status, text || res.statusText);
  }
  const data = await res.json() as FileResult;
  return success(data);
}
