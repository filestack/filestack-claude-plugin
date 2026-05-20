import fetch from 'node-fetch';
import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

export interface VideoConvertOptions {
  width?: number;
  height?: number;
  fps?: number;
  video_bitrate?: number;
  audio_bitrate?: number;
  audio_sample_rate?: number;
  audio_channels?: number;
  force?: boolean;
  watermark_url?: string;
  watermark_top?: number;
  watermark_left?: number;
  clip_length?: string; // hh:mm:ss
  clip_offset?: string; // hh:mm:ss
  // Async result delivery
  email?: string;
  upload_storage?: string;
  upload_path?: string;
  // S3 upload (when output should be stored back)
  container?: string;
  access?: 'public' | 'private';
  title?: string;
}

/**
 * Submit a video transcode job. Async — returns a UUID and a status_url that
 * the caller polls. The status endpoint returns { status: 'pending'|'started'|'completed'|'failed', data?: {...} }.
 *
 * Use a webhook (see filestack-webhook-setup skill) to be notified rather than
 * polling — the fp.video_converse event fires on completion.
 */
export async function filestackConvertVideo(
  handleOrUrl: string,
  preset: string,
  options?: VideoConvertOptions
): Promise<ToolResult<{ uuid: string; status_url: string; timestamp: number }>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  if (!handleOrUrl) return toolError('invalid_input', 'handleOrUrl is required');
  if (!preset) return toolError('invalid_input', 'preset is required (e.g. h264, hls, dash, mp3, mp4, m4a, webm)');

  const params: string[] = [`preset:${preset}`];
  if (options) {
    for (const [k, v] of Object.entries(options)) {
      if (v !== undefined && v !== null) params.push(`${k}:${v}`);
    }
  }

  const taskSeg = `video_convert=${params.join(',')}`;
  const isExternalUrl = /^https?:\/\//.test(handleOrUrl);
  const url = isExternalUrl
    ? `${CDN_BASE}/${apiKey}/${taskSeg}/${encodeURIComponent(handleOrUrl)}`
    : `${CDN_BASE}/${apiKey}/${taskSeg}/${handleOrUrl}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return toolError(res.status, text || res.statusText);
    }
    const data = await res.json() as { uuid?: string; status?: string; timestamp?: number };
    if (!data.uuid) {
      return toolError(500, `Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return success({
      uuid: data.uuid,
      status_url: `${CDN_BASE}/video_convert/${data.uuid}`,
      timestamp: data.timestamp ?? Date.now() / 1000,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return toolError(500, `Network error: ${e.message ?? 'Request failed'}`);
  }
}

/**
 * Poll a previously submitted video conversion job.
 */
export async function filestackVideoStatus(
  uuid: string
): Promise<ToolResult<Record<string, unknown>>> {
  if (!hasApiKey()) return AUTH_ERROR;

  if (!uuid || !/^[a-f0-9-]+$/i.test(uuid)) {
    return toolError('invalid_input', 'uuid must be a valid UUID');
  }

  try {
    const res = await fetch(`${CDN_BASE}/video_convert/${uuid}`);
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
