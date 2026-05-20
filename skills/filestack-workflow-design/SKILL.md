---
name: filestack-workflow-design
description: >
  Use when the user wants to design, run, or troubleshoot a Filestack Workflow — a
  multi-step file processing pipeline. Activates on: workflow design, multi-step processing,
  conditional file processing, automated pipelines, virus scanning workflow, video intelligence
  pipelines, async file processing, `runWorkflow` policy call, `run_workflow` task,
  `filestack_run_workflow`, `fs.workflow` webhook event, `wf.json`, workflow UUID,
  Filestack Workflows UI / Developer Portal Workflows.
---

# Filestack Workflows

Workflows are Filestack's primary asynchronous processing story — multi-step pipelines that run on every file upload (or on demand) and emit `fs.workflow` webhook events when complete.

Use this skill when the user wants to:

- Run a series of operations on each upload (resize → SFW check → store)
- Branch processing based on file type, MIME, intelligence result
- Use virus detection, video intelligence, or document workflows (these are workflow-only — not available as direct CDN tasks)
- Trigger an existing workflow from code

## When to choose a Workflow vs direct tasks

**Use direct CDN tasks** (`filestack_transform_url`, `filestack_transform_apply`, `filestack_analyze`) when:

- The operation is synchronous and returns a transformed file or JSON
- One or two transforms in a chain
- The result is fetched on demand (CDN-cached)

**Use a Workflow** when:

- ≥3 steps with conditional branches
- Background processing — caller doesn't wait
- One of these workflow-only tasks is needed:
  - `virus_detection`
  - `video_sfw`, `video_tagging` (video intelligence)
  - `phishing_detection`
- Multiple outputs need to be stored to different locations
- Caller wants webhook-driven completion via `fs.workflow` event

## Designing a Workflow

Workflows are designed in the **Filestack Developer Portal** (<https://dev.filestack.com/> → Workflows). They cannot be designed via API — only invoked via API once created.

A workflow has:

- **Tasks**: nodes that perform an action (transform, intelligence, store, webhook, etc.)
- **Conditions**: branches based on the previous task's output (e.g. `sfw == true`)
- **A trigger**: either explicit (via `filestack_run_workflow` or picker `storeTo.workflows`), or implicit (on upload)

### Walk the user through the Portal flow

1. Sign in at <https://dev.filestack.com/>
2. Open the target app → **Workflows** in left nav
3. Click **Create Workflow**
4. Drag tasks from the left panel onto the canvas. Tasks include:
   - **Transformation**: resize, crop, output, watermark, etc.
   - **Intelligence**: sfw, tags, caption, ocr, virus_detection, doc_detection, image_sentiment
   - **Storage**: store (S3/GCS/Azure/Rackspace)
   - **Webhook**: POST result to a customer URL
   - **Conditional**: branch on previous task output
5. Connect tasks with edges (right-handle → left-handle)
6. Save — the workflow gets a UUID
7. Copy the UUID into your application code or use it with `filestack_run_workflow`

## Common workflow patterns

### 1. Moderation pipeline

```
Upload → sfw → (if sfw=true) → tags → store to public bucket
                          ↓
                       (if sfw=false) → webhook to alert team → store to quarantine bucket
```

### 2. Document processing

```
Upload (PDF/image) → doc_detection → (if detected) → ocr → store text alongside file
                                ↓
                              (else) → webhook "manual review needed"
```

### 3. Video upload + intelligence

```
Upload (video) → virus_detection → video_convert (preset: h264, hls) → video_tagging → store outputs to S3
```

### 4. Virus scan gate

```
Upload → virus_detection → (if clean) → store to user bucket
                       ↓
                     (if infected) → webhook "infected upload from user X" → discard
```

## Invoking a Workflow from code

Once a workflow is created in the Portal, run it via `filestack_run_workflow`:

```ts
const result = await callTool('filestack_run_workflow', {
  handleOrUrl: 'abc123XYZ',
  workflowId: '67d273c3-249c-4192-b228-9c3e1d003963',
});
// result.result contains { jobid, status, ... }
```

For security-enabled apps, pre-generate a signed policy that includes BOTH `convert` AND `runWorkflow` in the `call` array:

```ts
const { policy, signature } = await callTool('filestack_generate_signed_url', {
  handle: 'abc123XYZ',
  call: ['convert', 'runWorkflow'],
  expiry: Math.floor(Date.now() / 1000) + 3600,
});

const result = await callTool('filestack_run_workflow', {
  handleOrUrl: 'abc123XYZ',
  workflowId: '67d273c3-249c-4192-b228-9c3e1d003963',
  options: { policy, signature },
});
```

## Receiving Workflow completion (webhooks)

Configure a webhook in the Developer Portal subscribed to `fs.workflow` events. Use `filestack_verify_webhook_signature` in your receiver to authenticate. Payload shape:

```json
{
  "id": 12345,
  "action": "fs.workflow",
  "timestamp": 1710000000,
  "text": {
    "workflow": "67d273c3-249c-4192-b228-9c3e1d003963",
    "job": "job-uuid",
    "status": "Finished",
    "sources": ["abc123XYZ"],
    "results": {
      "store_1": { "url": "...", "handle": "..." },
      "store_2": { "url": "...", "handle": "..." }
    }
  }
}
```

The `results` object is keyed by the **task name** as set in the workflow designer (rename your store tasks to something meaningful like `store_public` / `store_quarantine`).

## Triggering on upload

To run a workflow on every upload, pass the workflow ID(s) to the picker's `storeTo.workflows` option:

```ts
const picker = client.picker({
  storeTo: {
    location: 's3',
    workflows: ['67d273c3-249c-4192-b228-9c3e1d003963'],
  },
});
```

This emits a workflow job for each completed upload — fire-and-forget.

## Troubleshooting

- **Workflow returns 403**: policy is missing `runWorkflow` AND/OR `convert` calls. Both are required.
- **Workflow stuck in pending**: check the workflow logs in the Developer Portal → Workflows → click the job. Most often a downstream task (storage, webhook) is misconfigured.
- **Webhook never fires**: confirm the webhook is subscribed to `fs.workflow` (not `fp.upload`). The two are separate event types.
- **Conditional branch never taken**: condition comparisons are strict (e.g. `sfw == true` vs `sfw == "true"`); check the upstream task's actual output type in the workflow logs.
