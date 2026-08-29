NIX-BUILDS v2.3.0 — SEO Product URLs / Cloudflare Workers

این نسخه روی ساختار فعلی سایت شما ساخته شده و Supabase و پنل مدیریت فعلی را حفظ می‌کند.

ساختار:
  _worker.js              Worker برای URL محصولات، SEO و sitemap
  wrangler.jsonc          تنظیمات Cloudflare Workers Static Assets
  dist/index.html         سایت اصلی و پنل فعلی
  dist/manifest.webmanifest
  dist/sw.js
  dist/icon.svg

URLهای جدید:
  https://nixbuilds.nixshop.workers.dev/product/<slug>
  https://nixbuilds.nixshop.workers.dev/sitemap.xml
  https://nixbuilds.nixshop.workers.dev/robots.txt

نکته مهم:
این نسخه برای Cloudflare Workers با Static Assets + Worker script ساخته شده است.
اگر Worker فعلی شما فقط Static Assets را بدون فایل Worker منتشر می‌کند، باید پروژه را به این ساختار منتقل کنید.

اگر از GitHub + Cloudflare استفاده می‌کنید:
1) محتوای dist/ را به عنوان پوشه asset پروژه قرار دهید.
2) _worker.js و wrangler.jsonc را در ریشه پروژه قرار دهید.
3) Build command را در صورت نیاز خالی بگذارید.
4) Deploy را انجام دهید.
5) بعد از Deploy ابتدا این آدرس‌ها را تست کنید:
   /
   /product/pill-box
   /sitemap.xml
   /robots.txt

Supabase:
- جدول products همان جدول قبلی است.
- ستون‌های جدید: slug, seo_title, seo_description
- ستون‌های قبلی نسخه 2.2: description_* , seo_tags , image_gallery
- کلید publishable موجود حفظ شده است.
- پنل ورود مدیر و CRUD محصولات حفظ شده است.

توجه:
URL اختصاصی هر محصول از ستون slug خوانده می‌شود. برای 9 محصول فعلی slug اولیه ساخته شده است.
برای محصولات جدید، اگر slug را خالی بگذارید، فرم مدیریت آن را خودکار می‌سازد.

برای SEO واقعی، Worker در درخواست /product/<slug> اطلاعات محصول را از Supabase در HTML اولیه قرار می‌دهد؛ بنابراین title، description، canonical، Open Graph، Product JSON-LD و Breadcrumb JSON-LD قبل از اجرای JavaScript در پاسخ HTML وجود دارند.
