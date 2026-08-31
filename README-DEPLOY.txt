NIX-BUILDS v2.5.2

This package is a stability-focused update for the existing Cloudflare Worker site.

IMPORTANT:
- Keep the existing Supabase schema unchanged.
- Main product image column: image_data
- Product gallery column: image_gallery (jsonb)
- Existing admin panel logic is preserved.
- Keep your currently customized icon.svg if you prefer it.

Navigation architecture:
- Product-line buttons on the home page are filters on the home page.
- About, Contact, Shipping, Returns, Privacy and Terms are real Cloudflare-served pages.
- Every product uses a real /product/<slug> URL.
- No product-detail modal is used.

Image architecture:
- Browser product cards use /api/product-image/<id>?index=0.
- Product galleries use the same endpoint with index=1,2,...
- Cloudflare caches the binary image response.
- Large base64 image payloads are not put into localStorage.

Theme/language:
- Language is stored in localStorage.
- Light/dark theme is stored in localStorage.

Sorting:
- Newest / oldest
- Name A-Z / Z-A
- Price low-high / high-low

Recommended test:
Deploy to a test Worker/branch first. Test in a private window once after deployment so an older Service Worker cannot affect the result.
