import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

const VALID_FORMATS = [
  'pdf', 'doc', 'docx', 'odt', 'ppt', 'pptx', 'odp', 'xls', 'xlsx', 'ods',
  'html', 'txt', 'jpg', 'pjpg', 'png', 'webp', 'svg',
] as const;

export interface ConvertDocumentOptions {
  page?: number;        // PDF input: page to extract
  density?: number;     // DPI when rasterizing PDF
  quality?: number;     // jpg/pjpg/webp output
  pageformat?: string;  // a4, letter, etc. (when converting to PDF)
  pageorientation?: string; // portrait, landscape
  secure?: boolean;     // disable JS in PDF output
}

/**
 * Build a Filestack document-conversion CDN URL. Pure URL construction — no API
 * call. The CDN performs the actual conversion when the URL is fetched.
 * Pairs naturally with filestack_transform_apply if the caller wants to persist
 * the converted document as a new file handle.
 */
export function filestackConvertDocument(
  handleOrUrl: string,
  format: string,
  options?: ConvertDocumentOptions
): ToolResult<{ url: string }> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  if (!handleOrUrl) return toolError('invalid_input', 'handleOrUrl is required');
  if (!(VALID_FORMATS as readonly string[]).includes(format)) {
    return toolError('invalid_input', `Unsupported format '${format}'. Valid: ${VALID_FORMATS.join(', ')}`);
  }

  const params: string[] = [`format:${format}`];
  if (options?.page !== undefined) params.push(`page:${options.page}`);
  if (options?.density !== undefined) params.push(`density:${options.density}`);
  if (options?.quality !== undefined) params.push(`quality:${options.quality}`);
  if (options?.pageformat) params.push(`pageformat:${options.pageformat}`);
  if (options?.pageorientation) params.push(`pageorientation:${options.pageorientation}`);
  if (options?.secure !== undefined) params.push(`secure:${options.secure}`);

  const outputSeg = `output=${params.join(',')}`;

  // External URL inputs need the apikey segment; bare handles do not.
  const isExternalUrl = /^https?:\/\//.test(handleOrUrl);
  const url = isExternalUrl
    ? `${CDN_BASE}/${apiKey}/${outputSeg}/${encodeURIComponent(handleOrUrl)}`
    : `${CDN_BASE}/${outputSeg}/${handleOrUrl}`;

  return success({ url });
}

export const VALID_DOCUMENT_FORMATS = VALID_FORMATS;
