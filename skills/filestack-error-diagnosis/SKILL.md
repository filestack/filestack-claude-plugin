---
name: filestack-error-diagnosis
description: >
  Use when user encounters Filestack API errors. Activates on:
  domain tokens (filestackapi.com, filestackcontent.com, process.filestackapi.com),
  error shapes ({'result': 'error', 'error':, {'error':, result: null in Filestack context),
  HTTP 401/403/404/429 from Filestack endpoints,
  or when user pastes a Filestack API error message.
---

# Filestack Error Diagnosis

## Error Response Shape

Filestack APIs return errors in two formats:

**v1 API format** (`api.filestackapi.com`):
```json
{ "result": "error", "error": { "code": 403, "msg": "Policy required" } }
```

**Processing/CDN format** (`process.filestackapi.com`, `cdn.filestackcontent.com`):
```json
{ "error": "Unsupported conversion" }
```

(`v1` API includes a top-level `result` field; the processing/CDN edge does not — just `error` with a string or object.)

## HTTP Error Code Reference

| Code | Meaning | Likely Cause | Fix |
| --- | --- | --- | --- |
| 401 | Unauthorized | Invalid or missing API key | Check `FILESTACK_API_KEY` is correct and hasn't been rotated |
| 403 | Forbidden | Security policy violation, or CORS origin not whitelisted | See policy errors below |
| 404 | Not Found | Handle doesn't exist, has been deleted, or has expired | Verify handle is correct; check app's handle expiry setting |
| 429 | Rate Limited | Too many requests | Read Filestack rate-limit headers (below); implement exponential backoff |
| 500/502/503 | Server Error | Transient Filestack service issue | Retry with backoff; check status.filestack.com |

## Security Policy Errors (403)

403s from security-enabled apps are usually one of:

1. **Expired policy** — `expiry` unix timestamp is in the past
   ```python
   import time
   policy = { "expiry": int(time.time()) + 3600, "call": ["read"] }  # 1 hour from now
   ```

2. **Wrong signature** — HMAC computed with wrong secret, or policy was modified after signing
   - Re-generate both policy and signature together — never modify the policy JSON after signing

3. **Insufficient `call` scope** — policy doesn't include the operation being performed
   - `read` for CDN delivery, `store` for upload, `convert` for transformations, `remove` for delete

4. **Wrong CORS origin** — browser request blocked
   - Filestack dashboard → your app → Security → add your domain

## Transformation Errors

| Error | Cause | Fix |
| --- | --- | --- |
| "Unsupported input format" | Input file format not supported by the transform | Check Filestack docs for supported input formats per transform |
| "Output size limit exceeded" | Result would be larger than the app's output limit | Reduce target dimensions or use progressive encoding |
| "Processing timeout" | Transform took too long (usually video) | Use async transforms with a callback URL for video |
| "Invalid parameter" | Wrong parameter name or value type | Check CDN URL syntax: `param:value` (colon, not `=`) |

## Diagnosis Checklist

Run through this in order when debugging Filestack errors:

1. **API key valid?** — Try a simple retrieve call: `GET https://www.filestackapi.com/api/file/<handle>/metadata?key=<apikey>`
2. **Policy not expired?** — Decode the base64 policy and check the `expiry` field is in the future
3. **Handle exists?** — Retrieve metadata for the handle; 404 means handle is gone
4. **CORS origin whitelisted?** — Check Filestack dashboard → app → Security → Domains
5. **Transform params valid?** — Run the CDN URL in a browser; the error is often self-describing
6. **Rate limit hit?** — Check for 429 (or 503 on the upload edge) and Filestack-specific rate-limit headers:
   - `Filestack-Limit` — request quota for the window
   - `Filestack-Remaining` — requests left in the window
   - `Filestack-Reset` — unix timestamp when the window resets

   Note: Filestack does **not** emit the standard `Retry-After` header — use `Filestack-Reset` to compute backoff. The upload edge may also return `503 Service Unavailable` (not 429) when rate-limited; treat both as rate-limit signals.
