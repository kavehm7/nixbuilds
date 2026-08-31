NIX-BUILDS v2.5.3

This build fixes the broken client initialization in v2.5.2.

IMPORTANT:
- Supabase schema is NOT changed.
- Product main image column: image_data
- Product gallery column: image_gallery
- Keep your existing custom icon.svg if you already changed it in GitHub.

Files:
_worker.js
wrangler.jsonc
dist/index.html
dist/sw.js
dist/manifest.webmanifest
dist/icon.svg

Deploy the Worker using the existing Cloudflare configuration.
For the first test after deployment, use a Private/Incognito tab so old browser caches are not involved.
