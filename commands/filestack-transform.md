---
description: Build a Filestack CDN transformation URL from a file handle and a plain-English description
argument-hint: <handle-or-url> [transformation description]
model: inherit
---

# /filestack-transform

Build a Filestack CDN transformation URL from a file handle (or existing CDN URL) and a
plain-English description of what you want to do.

## How to use this command

1. Parse the first argument as the file handle or CDN URL
   - Bare handle: `abc123XYZ`
   - Full URL: `https://cdn.filestackcontent.com/abc123XYZ`

2. Interpret the rest of the arguments as a plain-English transformation description

3. Map to Filestack CDN URL syntax and return the full URL with an explanation of each segment

## CDN URL format

~~~
https://cdn.filestackcontent.com/<operation1>=<param1>:<val1>,<param2>:<val2>/<operation2>/<handle>
~~~

## Transform reference

| What you say | CDN segment |
| --- | --- |
| resize to 800x600 | `resize=width:800,height:600` |
| resize width 400 | `resize=width:400` |
| crop to [50,50,200,200] | `crop=dim:[50,50,200,200]` |
| detect and crop face | `crop_faces=faces:1` |
| rotate 90 degrees | `rotate=deg:90` |
| flip vertically | `flip` |
| flip horizontally | `flop` |
| enhance | `enhance` |
| grayscale / monochrome | `monochrome` |
| convert to webp | `output=format:webp` |
| convert to jpg quality 85 | `output=format:jpg,quality:85` |
| blur (amount 5) | `blur=amount:5` |
| sharpen | `sharpen=amount:3` |

## Examples

~~~
/filestack-transform abc123XYZ resize to 800x600 and convert to webp
→ https://cdn.filestackcontent.com/resize=width:800,height:600/output=format:webp/abc123XYZ

/filestack-transform abc123XYZ detect face, enhance, and convert to jpg at 85 quality
→ https://cdn.filestackcontent.com/crop_faces=faces:1/enhance/output=format:jpg,quality:85/abc123XYZ

/filestack-transform https://cdn.filestackcontent.com/abc123XYZ rotate 90 and monochrome
→ https://cdn.filestackcontent.com/rotate=deg:90/monochrome/abc123XYZ
~~~

If called with no arguments or an invalid handle, output a usage hint and examples — do not error.
