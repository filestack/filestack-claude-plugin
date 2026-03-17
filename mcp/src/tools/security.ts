import { createHmac } from 'crypto';
import { hasApiKey, hasAppSecret, getCredentials } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR, SECRET_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

const VALID_CALLS = ['read', 'stat', 'write', 'writeUrl', 'store', 'convert', 'remove', 'revoke', 'pick', 'exif', 'runWorkflow'] as const;
type PolicyCall = typeof VALID_CALLS[number];

export interface PolicyOptions {
  call: PolicyCall | PolicyCall[];
  expiry: number;
  handle?: string;
  path?: string;
  container?: string;
  minSize?: number;
  maxSize?: number;
}

export interface SignedUrlResult {
  policy: string;
  signature: string;
  signedUrl: string;
}

function buildPolicyObject(options: PolicyOptions): Record<string, unknown> {
  const calls = Array.isArray(options.call) ? options.call : [options.call];
  const policy: Record<string, unknown> = {
    expiry: options.expiry,
    call: calls,
  };
  if (options.handle) policy.handle = options.handle;
  if (options.path) policy.path = options.path;
  if (options.container) policy.container = options.container;
  if (options.minSize !== undefined) policy.minSize = options.minSize;
  if (options.maxSize !== undefined) policy.maxSize = options.maxSize;
  return policy;
}

export function filestackGeneratePolicy(options: PolicyOptions): ToolResult<string> {
  const calls = Array.isArray(options.call) ? options.call : [options.call];
  const invalidCalls = calls.filter(c => !VALID_CALLS.includes(c));
  if (invalidCalls.length > 0) {
    return toolError('invalid_input', `Invalid call values: ${invalidCalls.join(', ')}. Valid values: ${VALID_CALLS.join(', ')}`);
  }
  if (!options.expiry || options.expiry < Date.now() / 1000) {
    return toolError('invalid_input', 'expiry must be a future unix timestamp (seconds)');
  }

  const policyObj = buildPolicyObject(options);
  // Sort keys for deterministic serialization (not strictly required by Filestack,
  // but ensures consistent output for the same inputs)
  const policyJson = JSON.stringify(policyObj, Object.keys(policyObj).sort() as never);
  // URL-safe base64 without padding — matches Python's base64.urlsafe_b64encode()
  const policyB64 = Buffer.from(policyJson)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return success(policyB64);
}

export function filestackSignPolicy(policyB64: string): ToolResult<string> {
  if (!hasAppSecret()) return SECRET_ERROR;
  const { appSecret } = getCredentials();

  const signature = createHmac('sha256', appSecret!)
    .update(policyB64)
    .digest('hex');
  return success(signature);
}

export function filestackGenerateSignedUrl(
  handle: string,
  options: PolicyOptions
): ToolResult<SignedUrlResult> {
  if (!hasApiKey()) return AUTH_ERROR;
  if (!hasAppSecret()) return SECRET_ERROR;
  const { apiKey } = getCredentials();

  const policyResult = filestackGeneratePolicy(options);
  if (policyResult.result === null) return policyResult as ToolResult<SignedUrlResult>;

  const sigResult = filestackSignPolicy(policyResult.result);
  if (sigResult.result === null) return sigResult as ToolResult<SignedUrlResult>;

  const signedUrl = `${CDN_BASE}/${handle}?apikey=${apiKey}&policy=${policyResult.result}&signature=${sigResult.result}`;
  return success({
    policy: policyResult.result,
    signature: sigResult.result,
    signedUrl,
  });
}
