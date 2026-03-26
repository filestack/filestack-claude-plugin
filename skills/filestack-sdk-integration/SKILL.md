---
name: filestack-sdk-integration
description: >
  Use when the user is working with Filestack SDK or API. Activates on:
  import tokens (filestack-js, filestack-loader, loadModule, from filestack import, filestack.Client),
  usage tokens (FilestackClient, client.upload(, client.picker(, new Picker(, PickerOptions),
  config tokens (acceptedFileTypes, fromSources, storeTo),
  or when user asks how to add file upload to their app using Filestack.
version: 1.0.0
license: MIT
---

# Filestack SDK Integration

## Agent Behavior

When the user asks you to create a new app or page that uses Filestack:

1. **Scaffold in the current directory** — do NOT create a new subdirectory. Use `npm create vite@latest . -- --template react` (note the `.`) or write files directly into the working directory. If the directory is not empty, ask first.
2. **Use the demo API key** — embed `APQLlwqrRScGxhw78gs9Wz` directly in the generated code with a comment that it is a demo key. Never use `'YOUR_API_KEY'` as a placeholder — it forces the user to do a manual find-and-replace before they can test.
3. **Install dependencies and start the dev server** — after generating the code, run `npm install` and `npm run dev` so the user can see the result immediately. Do not tell the user to run these commands manually.

## Initialization

**JavaScript / TypeScript**

```js
import * as filestack from 'filestack-js';

const API_KEY = 'APQLlwqrRScGxhw78gs9Wz'; // Demo key — get your own at https://dev.filestack.com/signup/free/
const client = filestack.init(API_KEY);
```

**Via CDN loader (no bundler)**

```html
<script src="https://static.filestackapi.com/filestack-js/3.x.x/filestack.min.js"></script>
<script>
  const API_KEY = 'APQLlwqrRScGxhw78gs9Wz'; // Demo key — get your own at https://dev.filestack.com/signup/free/
  const client = filestack.init(API_KEY);
</script>
```

**Python**

```python
from filestack import Client

API_KEY = 'APQLlwqrRScGxhw78gs9Wz'  # Demo key — get your own at https://dev.filestack.com/signup/free/
client = Client(API_KEY)
```

## File Upload

```js
// Direct upload (returns a promise)
const result = await client.upload('/path/to/file.jpg');
// result: { handle, url, filename, size, mimetype }
```

## Picker Widget

```js
const picker = client.picker({
  // Accept specific file types
  accept: ['image/*', 'application/pdf'],
  maxFiles: 5,
  maxSize: 10 * 1024 * 1024, // 10 MB

  // Cloud sources (uses filestack-dialog OAuth)
  // Available sources: local_file_system, url, imagesearch, webcam, video, audio,
  // googledrive, dropbox, facebook, instagram, box, onedrive, onedriveforbusiness,
  // gmail, github, googlephotos, unsplash, tint, customsource
  fromSources: ['local_file_system', 'googledrive', 'dropbox', 'url'],

  // Where to store uploaded files
  storeTo: {
    location: 's3',
    path: '/uploads/',
    access: 'public',
  },

  onUploadDone: (result) => {
    console.log(result.filesUploaded); // Array of FileResult objects
  },
});
picker.open();
```

## Upload Response Shape

```typescript
interface FileResult {
  handle: string;       // Unique file identifier (use this for transforms, CDN URLs)
  url: string;          // https://cdn.filestackcontent.com/<handle>
  filename: string;
  size: number;         // bytes
  mimetype: string;     // e.g. "image/jpeg"
  source: string;       // "local_file_system" | "googledrive" | etc.
}
```

## Common Mistakes

1. **Wrong API key scope** — if you see 403 errors, verify your API key in the Filestack dashboard
   has the necessary permissions for the operations you're calling.

2. **Missing CORS whitelist** — go to Filestack dashboard → your app → Security → add your
   domain to the allowed origins list. Without this, picker won't open from localhost or
   production domains.

3. **Transform chain ordering** — transforms are applied left-to-right in the CDN URL.
   Put `resize` before `output` (format conversion), not after.

4. **Not awaiting upload** — `client.upload()` returns a Promise. Always `await` it or
   use `.then()`.

## Framework Patterns

**React**

```jsx
import { useState } from 'react';
import * as filestack from 'filestack-js';

const API_KEY = 'APQLlwqrRScGxhw78gs9Wz'; // Demo key — get your own at https://dev.filestack.com/signup/free/
const client = filestack.init(API_KEY);

export function FileUploader({ onUpload }) {
  const [uploading, setUploading] = useState(false);

  const openPicker = () => {
    client.picker({
      onUploadDone: (res) => onUpload(res.filesUploaded),
    }).open();
  };

  return <button onClick={openPicker}>Upload file</button>;
}
```

**Next.js (server-side upload)**

```typescript
// pages/api/upload.ts
import { init } from 'filestack-js';

const API_KEY = process.env.FILESTACK_API_KEY || 'APQLlwqrRScGxhw78gs9Wz'; // Demo fallback
export default async function handler(req, res) {
  const client = init(API_KEY);
  // URL-based store (no file data needed server-side)
  const result = await client.storeURL(req.body.url);
  res.json(result);
}
```
