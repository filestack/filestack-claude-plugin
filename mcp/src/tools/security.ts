import { createHmac } from 'crypto';
import { hasApiKey, hasAppSecret, getCredentials } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR, SECRET_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

// Official policy call enum per filestack-js schema. 'revoke' is a deprecated server-side
// alias for 'remove' — omitted here so the plugin always emits the modern form.
const VALID_CALLS = ['pick', 'read', 'stat', 'write', 'writeUrl', 'store', 'convert', 'remove', 'exif', 'runWorkflow'] as const;
type PolicyCall = typeof VALID_CALLS[number];

export interface PolicyOptions {
  call: PolicyCall | PolicyCall[];
  expiry: number;
  handle?: string;
  url?: string;        // restrict writeUrl/store to a specific source URL (or regex)
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
  if (options.url) policy.url = options.url;
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
  // URL-safe base64 WITH padding — matches Filestack server's strict
  // base64.urlsafe_b64decode which requires input length % 4 == 0.
  // Stripping padding caused "policy was not properly url-safe base64 encoded" errors
  // for any policy whose JSON length wasn't a multiple of 3 bytes.
  const policyB64 = Buffer.from(policyJson)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
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

  const policyResult = filestackGeneratePolicy(options);
  if (policyResult.result === null) return policyResult as ToolResult<SignedUrlResult>;

  const sigResult = filestackSignPolicy(policyResult.result);
  if (sigResult.result === null) return sigResult as ToolResult<SignedUrlResult>;

  // Path-based security segment — the canonical Filestack CDN form, matches
  // filestack-js and filestack-python SDK output. Chainable with transforms:
  //   cdn.filestackcontent.com/<transforms>/security=policy:...,signature:.../<handle>
  // Per docs/content/security/policies.md.
  const signedUrl = `${CDN_BASE}/security=policy:${policyResult.result},signature:${sigResult.result}/${handle}`;
  return success({
    policy: policyResult.result,
    signature: sigResult.result,
    signedUrl,
  });
}
