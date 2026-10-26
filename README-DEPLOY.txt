NIX-BUILDS Website — Version 2.5.21

Files included:
- index.html: existing frontend, product gallery, and cart with approximate toman estimates.
- _worker.js: existing Cloudflare Worker routes and cached exchange-rate endpoint.

Deploy using the same structure and method as your existing GitHub/Cloudflare project. Replace the corresponding existing files; do not upload the ZIP itself as a site asset.

Changes in 2.5.21:
1. Added approximate toman estimates beside each USDT-priced cart item. For quantities greater than one, the cart shows the approximate line total.
2. Added an approximate toman subtotal under the original cart total. It includes only products priced in USDT; BTC/ETH items are excluded to avoid a misleading conversion.
3. Added a clear note explaining that toman values are estimates and the final amount is confirmed using the rate at order time.
4. Preserved the v2.5.20 touch gallery/fullscreen behavior and existing features.
5. Incremented the frontend and Worker version to 2.5.21.

No Supabase schema or product records were changed. Original product prices and currencies remain unchanged; toman values are calculated for display only.
