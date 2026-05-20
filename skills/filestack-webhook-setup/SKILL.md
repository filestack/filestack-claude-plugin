---
name: filestack-webhook-setup
description: >
  Use when user is setting up Filestack webhook endpoints. Activates on:
  FS-Signature, FS-Timestamp, fp.upload, fp.converse, fp.delete,
  fp.overwrite, fp.video_converse, fp.scan, fp.export, fs.workflow, filestack_webhook,
  webhook_url, or when user asks about Filestack event notifications.
---

# Filestack Webhook Setup

## Webhook Event Types

| Event | When it fires |
| --- | --- |
| `fp.upload` | File successfully uploaded and stored |
| `fp.converse` | Image conversion (filepicker-converse) completed |
| `fp.delete` | File deleted |
| `fp.overwrite` | File overwritten |
| `fp.video_converse` | Video conversion completed |
| `fp.scan` | Antivirus scan completed |
| `fp.export` | File exported to cloud storage |
| `fs.workflow` | Workflow pipeline completed |

## Register a Webhook URL

```bash
curl -X POST https://api.filestackapi.com/webhooks/YOUR_APP_ID \
  -H "Content-Type: application/json" \
  -H "Filestack-API-Key: YOUR_API_KEY" \
  -d '{ "url": "https://yourdomain.com/filestack-webhook", "webhook_type": "fp.upload" }'
```

## Webhook Payload Shape

```json
{
  "id": 30813791,
  "action": "fp.upload",
  "timestamp": 1710000000,
  "text": {
    "container": "filestack-uploads",
    "url": "https://cdn.filestackcontent.com/abc123XYZ",
    "filename": "image.jpg",
    "client": "Computer",
    "key": "abc123XYZ",
    "type": "image/jpeg",
    "status": "Stored",
    "size": 102400
  }
}
```

## Signature Verification

Filestack signs webhooks with HMAC-SHA256 using a **per-webhook secret** (created in the
Developer Portal when configuring the webhook — this is NOT the app secret). The signature covers
`"{timestamp}.{body}"` — the `FS-Timestamp` header value, a dot, and the raw request body.

**Headers sent by Filestack:**

- `FS-Signature` — HMAC-SHA256 hex digest
- `FS-Timestamp` — Unix timestamp (string) used in signing

**Node.js**

```typescript
import { createHmac } from 'crypto';
import type { Request, Response } from 'express';

export function verifyFilestackSignature(req: Request): boolean {
  const signature = req.headers['fs-signature'] as string;
  const timestamp = req.headers['fs-timestamp'] as string;
  if (!signature || !timestamp) return false;

  // Filestack signs "{timestamp}.{body}" — must match exactly
  const signPayload = `${timestamp}.${req.rawBody}`;
  const expected = createHmac('sha256', process.env.FILESTACK_WEBHOOK_SECRET!)
    .update(signPayload)
    .digest('hex');
  return signature === expected;
}

export function webhookHandler(req: Request, res: Response): void {
  // CRITICAL: Return 200 BEFORE processing — prevents duplicate delivery on timeout
  if (!verifyFilestackSignature(req)) {
    res.status(401).send('Invalid signature');
    return;
  }
  res.status(200).send('ok');

  // Process asynchronously after responding
  setImmediate(() => processEvent(req.body));
}
```

**Python (Flask)**

```python
import hmac, hashlib, os, threading
from flask import request, jsonify

def verify_signature(raw_body: bytes, timestamp: str, signature: str) -> bool:
    # Filestack signs "{timestamp}.{body}"
    sign_payload = f"{timestamp}.{raw_body.decode('latin-1')}"
    expected = hmac.new(
        os.environ['FILESTACK_WEBHOOK_SECRET'].encode('latin-1'),
        sign_payload.encode('latin-1'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/filestack-webhook', methods=['POST'])
def webhook():
    sig = request.headers.get('FS-Signature', '')
    ts = request.headers.get('FS-Timestamp', '')
    if not verify_signature(request.get_data(), ts, sig):
        return jsonify({'error': 'invalid signature'}), 401

    # Acknowledge immediately before any slow processing
    threading.Thread(target=process_event, args=(request.json,)).start()
    return jsonify({'status': 'ok'}), 200
```

**Go**

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
)

func verifySignature(body []byte, timestamp, signature, appSecret string) bool {
    // Filestack signs "{timestamp}.{body}"
    signPayload := fmt.Sprintf("%s.%s", timestamp, string(body))
    mac := hmac.New(sha256.New, []byte(appSecret))
    mac.Write([]byte(signPayload))
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(signature))
}
```

## Critical Patterns

**Return 200 immediately, then process async.**
Filestack's webhook consumer has a configurable timeout (default ~30s). If your handler times out,
Filestack retries — leading to duplicate processing. Always acknowledge (200/201/204) before doing any slow work.

**Handlers must be idempotent.**
Filestack retries failed deliveries up to 5 times with timeouts [10s, 60s, 5min, 15min, 1hr].
Success codes are 200, 201, 204. Use the `id` field from the payload as an idempotency key.

**Use raw body for signature verification.**
JSON parsers may reformat the body, invalidating the signature. Capture the raw bytes
before parsing:

```js
// Express: use express.raw() for the webhook route
app.post('/filestack-webhook', express.raw({ type: 'application/json' }), webhookHandler);
```
