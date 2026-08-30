NIX-BUILDS v2.4.1 — SEO / Ecommerce / Cloudflare Workers

این نسخه بر پایه v2.3.0 ساخته شده و Supabase، ورود مدیر، CRUD محصولات، سبد خرید، SMS و PWA را حفظ می‌کند.

امکانات جدید v2.4.1:
- صفحات SEO واقعی: /products و /category/nix-home و /category/nix-gear و /category/nix-care
- صفحات اعتماد و اطلاعات: /about /contact /shipping /returns /privacy /terms
- لینک‌های قابل crawl برای هر محصول
- ItemList و CollectionPage و Organization/WebSite structured data
- لینک‌سازی داخلی و Related Product آماده برای صفحات محصول
- جستجو و مرتب‌سازی محصولات در صفحه اصلی
- noindex برای URLهای جستجو/فیلتر تا صفحات کم‌ارزش وارد index نشوند
- بهبود alt تصاویر و canonical/OG/meta robots
- Product structured data در HTML اولیه؛ برای قیمت‌های USDT، Offer با currency نامعتبر حذف شده تا داده ساختاریافته نادرست ارسال نشود
- sitemap.xml شامل صفحات اصلی، دسته‌ها، صفحات اطلاعاتی و محصولات
- robots.txt با ارجاع به sitemap
- PWA cache version 2.4.1

ساختار:
  _worker.js
  wrangler.jsonc
  dist/index.html
  dist/manifest.webmanifest
  dist/sw.js
  dist/icon.svg

نکته آیکن:
فایل icon.svg نسخه پایه در این بسته حفظ شده است. اگر آیکن جدیدی که در تست v2.3-test انتخاب کرده‌اید بهتر است، فقط همان icon.svg را در dist جایگزین کنید؛ سایر فایل‌ها نیازی به تغییر ندارند.

Cloudflare:
- Build command: خالی / None
- Deploy command: npx wrangler deploy
- Version command: npx wrangler versions upload
- Root directory: /
- Production branch: فعلاً همان Index؛ قبل از انتشار نهایی تغییر ندهید.

پس از تست Preview این URLها را بررسی کنید:
/
/products
/category/nix-home
/category/nix-gear
/category/nix-care
/product/<slug>
/about
/contact
/sitemap.xml
/robots.txt

Google Search Console:
پس از انتشار Production، sitemap را با مسیر sitemap.xml در Search Console ثبت کنید و URLهای مهم را با URL Inspection بررسی کنید.
