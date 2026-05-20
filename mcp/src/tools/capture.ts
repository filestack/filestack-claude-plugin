import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

export interface ScreenshotOptions {
  agent?: 'desktop' | 'mobile';
  mode?: 'all' | 'window';
  width?: number;
  height?: number;
  delay?: number; // ms
  orientation?: 'portrait' | 'landscape';
  device?: string; // e.g. iphone6plus (mobile only)
}

/**
 * Build a URL screenshot CDN URL. Pure URL construction.
 * URL form: cdn.filestackcontent.com/<APIKEY>/urlscreenshot=<params>/<encoded_url>
 */
export function filestackScreenshotUrl(
  targetUrl: string,
  options?: ScreenshotOptions
): ToolResult<{ url: string }> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
    return toolError('invalid_input', 'targetUrl must be a full http(s) URL');
  }

  const params: string[] = [];
  if (options?.agent) params.push(`agent:${options.agent}`);
  if (options?.mode) params.push(`mode:${options.mode}`);
  if (options?.width !== undefined) params.push(`width:${options.width}`);
  if (options?.height !== undefined) params.push(`height:${options.height}`);
  if (options?.delay !== undefined) params.push(`delay:${options.delay}`);
  if (options?.orientation) params.push(`orientation:${options.orientation}`);
  if (options?.device) params.push(`device:${options.device}`);

  const taskSeg = params.length ? `urlscreenshot=${params.join(',')}` : 'urlscreenshot';
  const url = `${CDN_BASE}/${apiKey}/${taskSeg}/${encodeURIComponent(targetUrl)}`;
  return success({ url });
}
