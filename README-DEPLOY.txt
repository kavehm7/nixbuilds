NIX-BUILDS Website — Version 2.5.20

Files included:
- index.html: existing frontend and features, restored swipe/fullscreen product image gallery, approximate toman price display, and footer version.
- _worker.js: existing Cloudflare Worker routes plus cached exchange-rate endpoint and Worker version.

Deploy using the same structure and method as your existing GitHub/Cloudflare project. Replace the corresponding existing files; do not upload the ZIP itself as a site asset.

Changes in 2.5.20:
1. Restored product-image swipe left/right on touch devices and fullscreen image viewing with previous/next controls, keyboard arrows, and Escape to close.
2. Added approximate toman prices beside USDT prices, using Nerkhsanj's public free-market USD rate feed. The Worker fetches/caches the rate for 5 minutes; the browser also keeps the last successfully received rate as a fallback.
3. Shows source and update time beside the approximate toman amount. The displayed toman amount is an estimate, not the final payable price.
4. Version incremented to 2.5.20.

No Supabase schema or product records were changed. Existing product prices remain stored/displayed in their original currencies; the toman value is calculated for display only.
