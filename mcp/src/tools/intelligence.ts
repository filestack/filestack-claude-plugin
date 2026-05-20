import fetch from 'node-fetch';
import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

// File-based intelligence tasks (take a handle, return JSON)
const FILE_TASKS = ['tags', 'sfw', 'caption', 'ocr', 'copyright', 'image_sentiment', 'doc_detection'] as const;
// Text-only intelligence tasks (take a text string, no handle)
const TEXT_TASKS = ['text_sentiment'] as const;

type FileTask = typeof FILE_TASKS[number];
type TextTask = typeof TEXT_TASKS[number];

export type IntelligenceTask = FileTask | TextTask;

const ALL_TASKS: readonly string[] = [...FILE_TASKS, ...TEXT_TASKS];

export interface AnalyzeOptions {
  // doc_detection only
  coords?: boolean;
  preprocess?: boolean;
  // text_sentiment only
  text?: string;
  language?: string;
}

/**
 * Run a Filestack intelligence task against a file handle (or for text_sentiment, a text string).
 * All tasks resolve to CDN URLs and return JSON.
 *
 * Security note: when the app has security enabled, the caller must pre-generate
 * a signed URL via filestack_generate_signed_url and pass `handleOrUrl` as the
 * full signed URL — this tool composes the task segment in front of the handle.
 */
export async function filestackAnalyze(
  task: string,
  handleOrText: string,
  options?: AnalyzeOptions
): Promise<ToolResult<Record<string, unknown>>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  if (!ALL_TASKS.includes(task)) {
    return toolError('invalid_input', `Unknown task '${task}'. Valid: ${ALL_TASKS.join(', ')}`);
  }
  if (!handleOrText || typeof handleOrText !== 'string') {
    return toolError('invalid_input', task === 'text_sentiment' ? 'text is required' : 'handle is required');
  }

  let url: string;
  if (task === 'text_sentiment') {
    const text = options?.text ?? handleOrText;
    const language = options?.language;
    const escaped = encodeURIComponent(text);
    const langSeg = language ? `,language:${language}` : '';
    url = `${CDN_BASE}/${apiKey}/text_sentiment=text:"${escaped}"${langSeg}/`;
  } else if (task === 'doc_detection') {
    const segs: string[] = [];
    if (options?.coords !== undefined) segs.push(`coords:${options.coords}`);
    if (options?.preprocess !== undefined) segs.push(`preprocess:${options.preprocess}`);
    const taskSeg = segs.length ? `doc_detection=${segs.join(',')}` : 'doc_detection';
    url = `${CDN_BASE}/${taskSeg}/${encodeURIComponent(handleOrText)}`;
  } else {
    url = `${CDN_BASE}/${task}/${encodeURIComponent(handleOrText)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return toolError(res.status, text || res.statusText);
    }
    const data = await res.json() as Record<string, unknown>;
    return success(data);
  } catch (err: unknown) {
    const e = err as { message?: string };
    return toolError(500, `Network error: ${e.message ?? 'Request failed'}`);
  }
}

export const INTELLIGENCE_TASKS = ALL_TASKS;
