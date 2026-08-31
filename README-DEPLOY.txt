NIX-BUILDS v2.5.5

This release keeps the existing Supabase schema unchanged:
- products.image_data = primary product image
- products.image_gallery = JSONB gallery

Important architecture:
- Public product catalog data is read through Cloudflare Worker API endpoints:
  /api/products
  /api/product-by-slug/<slug>
  /api/site-settings
- Product images are served through:
  /api/product-image/<id>?index=0
  /api/product-image/<id>?index=1 ...
- Admin CRUD continues to use the existing Supabase connection from the dashboard.

Deploy the Worker with the existing Cloudflare static-assets configuration.
Keep your current icon.svg if you previously customized it.
