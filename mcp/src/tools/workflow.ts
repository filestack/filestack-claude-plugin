import fetch from 'node-fetch';
import { getCredentials, hasApiKey } from '../auth';
import { ToolResult, success, toolError, AUTH_ERROR } from '../types';

const CDN_BASE = 'https://cdn.filestackcontent.com';

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export interface RunWorkflowOptions {
  policy?: string;
  signature?: string;
}

/**
 * Run a saved Filestack Workflow against a file handle (or external URL).
 * Workflows are designed in the Filestack Developer Portal (dev.filestack.com)
 * and identified by UUID. This invokes the workflow synchronously through the
 * CDN — the response contains the workflow run ID, which fp.workflow webhook
 * events reference.
 *
 * URL form (bare):     cdn.filestackcontent.com/run_workflow=id:<WF>/<handle>
 * URL form (signed):   cdn.filestackcontent.com/security=policy:<P>,signature:<S>/run_workflow=id:<WF>/<handle>
 * URL form (ext URL):  cdn.filestackcontent.com/<APIKEY>/run_workflow=id:<WF>/<external_url>
 */
export async function filestackRunWorkflow(
  handleOrUrl: string,
  workflowId: string,
  options?: RunWorkflowOptions
): Promise<ToolResult<Record<string, unknown>>> {
  if (!hasApiKey()) return AUTH_ERROR;
  const { apiKey } = getCredentials();

  if (!handleOrUrl) return toolError('invalid_input', 'handleOrUrl is required');
  if (!workflowId || !UUID_RE.test(workflowId)) {
    return toolError('invalid_input', 'workflowId must be a UUID (find it in dev.filestack.com → Workflows)');
  }

  const segments: string[] = [];
  if (options?.policy && options?.signature) {
    segments.push(`security=policy:${options.policy},signature:${options.signature}`);
  }
  segments.push(`run_workflow=id:${workflowId}`);

  const isExternalUrl = /^https?:\/\//.test(handleOrUrl);
  const url = isExternalUrl
    ? `${CDN_BASE}/${apiKey}/${segments.join('/')}/${encodeURIComponent(handleOrUrl)}`
    : `${CDN_BASE}/${segments.join('/')}/${handleOrUrl}`;

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
