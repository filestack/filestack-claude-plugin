import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

const HANDLE_RE = /^[a-zA-Z0-9_\-]+$/;

/**
 * Build a ZIP-bundling CDN URL from a list of file handles. Pure URL construction,
 * no API call — the CDN does the actual zipping when the URL is requested.
 *
 * URL form: cdn.filestackcontent.com/<APIKEY>/zip/[<h1>,<h2>,...]
 */
export function filestackZipFiles(handles: string[]): ToolResult<{ url: string }> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  if (!Array.isArray(handles) || handles.length === 0) {
    return toolError('invalid_input', 'handles must be a non-empty array of file handles');
  }
  if (handles.length > 100) {
    return toolError('invalid_input', 'maximum 100 handles per zip request');
  }

  for (const h of handles) {
    if (typeof h !== 'string' || !HANDLE_RE.test(h)) {
      return toolError('invalid_input', `Invalid handle in array: ${String(h).slice(0, 40)}`);
    }
  }

  const list = `[${handles.join(',')}]`;
  const url = `${CDN_BASE}/${apiKey}/zip/${list}`;
  return success({ url });
}
