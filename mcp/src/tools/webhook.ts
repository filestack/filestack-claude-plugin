import { createHmac, timingSafeEqual } from 'crypto';
import { ToolResult, success, toolError } from '../types';

/**
 * Verify a Filestack webhook HMAC-SHA256 signature locally. No network call.
 *
 * Filestack signs "{FS-Timestamp}.{raw_body}" with the per-webhook secret
 * (created in dev.filestack.com when configuring the webhook). The receiver
 * computes the same and compares with the FS-Signature header.
 */
export function filestackVerifyWebhookSignature(
  rawBody: string,
  fsSignature: string,
  fsTimestamp: string,
  webhookSecret: string
): ToolResult<{ valid: boolean; expected: string }> {
  if (!rawBody) return toolError('invalid_input', 'rawBody is required (the raw bytes of the webhook request body)');
  if (!fsSignature) return toolError('invalid_input', 'fsSignature is required (FS-Signature header value)');
  if (!fsTimestamp) return toolError('invalid_input', 'fsTimestamp is required (FS-Timestamp header value)');
  if (!webhookSecret) return toolError('invalid_input', 'webhookSecret is required (the per-webhook secret from dev.filestack.com)');

  const signPayload = `${fsTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', webhookSecret).update(signPayload).digest('hex');

  // Constant-time compare — guards against timing oracles
  let valid = false;
  try {
    const a = Buffer.from(fsSignature, 'hex');
    const b = Buffer.from(expected, 'hex');
    valid = a.length === b.length && timingSafeEqual(a, b);
  } catch {
    valid = false;
  }

  return success({ valid, expected });
}

/**
 * Generate the FS-Signature and FS-Timestamp headers for a given webhook body
 * and secret — for testing your own webhook receiver locally.
 */
export function filestackSignWebhookPayload(
  body: string,
  webhookSecret: string,
  timestamp?: number
): ToolResult<{ 'FS-Signature': string; 'FS-Timestamp': string; signPayload: string }> {
  if (!body) return toolError('invalid_input', 'body is required (raw JSON string)');
  if (!webhookSecret) return toolError('invalid_input', 'webhookSecret is required');

  const ts = (timestamp ?? Math.floor(Date.now() / 1000)).toString();
  const signPayload = `${ts}.${body}`;
  const signature = createHmac('sha256', webhookSecret).update(signPayload).digest('hex');

  return success({
    'FS-Signature': signature,
    'FS-Timestamp': ts,
    signPayload,
  });
}
