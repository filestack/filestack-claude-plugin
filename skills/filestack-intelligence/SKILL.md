---
name: filestack-intelligence
description: >
  Use when the user wants to analyze a file's content with AI/ML — content tagging, NSFW
  detection, OCR, image captioning, copyright check, document detection, or sentiment.
  Activates on: image tagging, NSFW/SFW classification, content moderation, OCR text
  extraction, image caption generation, "what's in this image", document scan/detection,
  sentiment analysis, AWS Rekognition, Google Cloud Vision, content classification,
  AI moderation pipeline, image analysis, or tokens like `filestack_analyze`, `/tags/`,
  `/sfw/`, `/caption/`, `/ocr/`, `/doc_detection/`.
---

# Filestack Intelligence

Filestack exposes AI/ML capabilities as **CDN transformation tasks** that take a file handle and return JSON. They are backed by AWS Rekognition, Google Cloud Vision, AWS Comprehend/Transcribe, PicScout (copyright), and proprietary models.

Use `filestack_analyze` to invoke them — one tool, one `task` param.

## Tasks

| Task | Input | Output | Backed by | Use case |
|---|---|---|---|---|
| `tags` | image handle | `{ tags: { auto: { keyword: confidence } } }` | AWS Rekognition + Google Vision (best-of-both) | Auto-tagging for search/discovery |
| `sfw` | image handle | `{ sfw: boolean }` (true = safe) | AWS Rekognition moderation labels | User-generated content moderation |
| `caption` | image handle | `{ caption: "a photo of a..." }` | Vision-language model | Auto alt-text, accessibility, content description |
| `ocr` | image / PDF handle | `{ text: "...", confidence, blocks: [...] }` | Google Cloud Vision OCR | Receipts, invoices, signage, document digitization |
| `copyright` | image handle | `{ copyright: boolean, matches: [...] }` | PicScout / Getty Images | Detect stock photos / IP violation before publishing |
| `doc_detection` | photo of a document | `{ detected: boolean, corners?: [[x,y]...] }` | Proprietary model | Mobile scanning UX — detect doc edges in a phone photo |
| `image_sentiment` | image handle (with faces) | `{ sentiment: "positive\|neutral\|negative", confidence }` | AWS Rekognition emotions | Detect mood / engagement in user photos |
| `text_sentiment` | text string (no handle) | `{ sentiment, confidence, language }` | AWS Comprehend | Analyze captions, comments, reviews |

## Choosing the right task

- **Moderation pipeline** (UGC platforms): chain `sfw` then `tags`. If `sfw=false`, reject; if `sfw=true` but tags contain words like "weapon" / "violence", flag for review.
- **Alt-text / accessibility**: `caption` — single natural-language sentence.
- **Search/categorization**: `tags` — gives you 20-50 keywords with confidence scores.
- **Compliance** (stock photo enforcement, DMCA risk): `copyright` before allowing user uploads to be displayed publicly.
- **Mobile doc scanner**: `doc_detection` returns corners; combine with `partial_pixelate` on sensitive regions.
- **Reviews / comments analysis**: `text_sentiment` — no file needed, pass the text directly.

## Examples

**One-shot SFW + tags moderation check**

```ts
// In your upload handler, after filestack_upload
const sfw = await callTool('filestack_analyze', { task: 'sfw', handleOrText: handle });
if (!sfw.result.sfw) return reject('NSFW content detected');

const tags = await callTool('filestack_analyze', { task: 'tags', handleOrText: handle });
const auto = tags.result.tags.auto;
const flagged = ['weapon', 'violence', 'drug'].filter(k =>
  Object.keys(auto).some(t => t.toLowerCase().includes(k))
);
if (flagged.length) return flagForReview({ handle, reasons: flagged });
```

**Generate caption + tags in one pass** (for SEO alt-text + indexing)

```ts
const [cap, tags] = await Promise.all([
  callTool('filestack_analyze', { task: 'caption', handleOrText: handle }),
  callTool('filestack_analyze', { task: 'tags', handleOrText: handle }),
]);
const altText = cap.result.caption;
const keywords = Object.entries(tags.result.tags.auto)
  .filter(([, conf]) => Number(conf) > 70)
  .map(([k]) => k);
```

**OCR a receipt photo**

```ts
const ocr = await callTool('filestack_analyze', { task: 'ocr', handleOrText: handle });
// ocr.result.text — full text in reading order
// ocr.result.blocks — bounding boxes if you need positional info
```

**Detect document edges before further processing**

```ts
const doc = await callTool('filestack_analyze', {
  task: 'doc_detection',
  handleOrText: handle,
  options: { coords: true, preprocess: true },
});
// doc.result.corners → use to crop the photo to just the document
```

**Sentiment on user reviews**

```ts
const sent = await callTool('filestack_analyze', {
  task: 'text_sentiment',
  handleOrText: 'This product changed my life',
  options: { language: 'en' },
});
// sent.result.sentiment === 'positive'
```

## Important notes

1. **Security policies must include `convert`**. For security-enabled apps, the policy used to sign the request needs `convert` in the `call` array — `read` alone won't work for intelligence tasks. Generate the policy via `filestack_generate_signed_url` with `call: ['read', 'convert']`.

2. **`tags` returns confidence scores 0-100**, not 0-1. Threshold at ~60-70 for high-precision filtering.

3. **`sfw` is binary**, not a probability. Don't show partial confidence; Filestack does the thresholding server-side.

4. **`text_sentiment` does NOT take a handle** — pass the raw text in `handleOrText` and optionally `options.language`. Other tasks all take a handle.

5. **Caching**: All intelligence results are CDN-cached by handle for 24h. Re-calling `filestack_analyze` with the same handle is free.

6. **Cost / limits**: Intelligence tasks count against a separate quota in the Filestack Developer Portal. Heavy usage benefits from batching via `filestack_run_workflow` with a designed pipeline (e.g., upload → sfw → tags → store metadata in one async job).

7. **Video intelligence** (`video_sfw`, `video_tagging`) is **NOT** exposed via direct transform tasks — it must go through Workflows. Use `filestack_run_workflow` with a workflow that includes the relevant video intelligence step.
