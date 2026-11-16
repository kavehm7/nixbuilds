NIX-BUILDS v2.5.24 — Image-data safety hotfix

Based strictly on v2.5.23. Deploy index.html and _worker.js together using the existing Cloudflare/GitHub workflow.

Fixes:
- Editing an existing product without selecting new images NEVER sends image_data or image_gallery to Supabase.
- Only actual newly uploaded, processed image data can overwrite images. Rejects display URLs and malformed image gallery entries.
- Prevents saving while uploaded images are being processed.
- Worker rejects self-referential /api/product-image URLs as image data.
- All other features preserved from v2.5.23. No DB migrations or automatic writes.

IMPORTANT: This does not restore previously overwritten photos. After deployment, test one out-of-stock product with new photos and confirm database contents before restoring others. Back up existing product data first.
