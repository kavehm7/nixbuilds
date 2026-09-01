/**
 * NIX-BUILDS SEO / Product Router
 * Cloudflare Workers + Static Assets
 *
 * This Worker keeps the existing Supabase frontend/admin intact.
 * It adds:
 *   /product/<slug>  -> server-rendered SEO metadata + product JSON
 *   /sitemap.xml     -> live sitemap from Supabase
 *   /robots.txt      -> crawler instructions
 * All other requests are served from the static assets directory.
 */

const SITE_URL = "https://nixbuilds.nixshop.workers.dev";
const SITE_VERSION = "2.5.12";
const SUPABASE_URL = "https://plnpudnkqeqfovqieqje.supabase.co";
const SUPABASE_KEY = "sb_publishable_oTKJhQ9aoBr2CJWu65-Eag_KC58uBMQ";

const PRODUCT_SELECT = [
  "id","created_at","product_line","slug","seo_title","seo_description","seo_tags",
  "image_data","image_gallery",
  "name_fa","name_en","name_ar","name_zh","name_ru",
  "material_fa","material_en","material_ar","material_zh","material_ru",
  "dimensions_fa","dimensions_en","dimensions_ar","dimensions_zh","dimensions_ru",
  "description_fa","description_en","description_ar","description_zh","description_ru",
  "price_usdt","price_btc","price_eth"
].join(",");


const PRODUCT_LIST_SELECT = [
  "id","created_at","product_line","slug","seo_title","seo_description","seo_tags",
  "name_fa","name_en","name_ar","name_zh","name_ru",
  "material_fa","material_en","material_ar","material_zh","material_ru",
  "dimensions_fa","dimensions_en","dimensions_ar","dimensions_zh","dimensions_ru",
  "description_fa","description_en","description_ar","description_zh","description_ru",
  "price_usdt","price_btc","price_eth"
].join(",");

function jsonApi(data, status=200, maxAge=0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type":"application/json; charset=UTF-8",
      "cache-control": maxAge ? `public,max-age=${maxAge},s-maxage=${maxAge}` : "no-store",
      "x-content-type-options":"nosniff"
    }
  });
}

async function productsApiResponse() {
  const rows = await supabaseGet(`products?select=${encodeURIComponent(PRODUCT_LIST_SELECT)}&order=created_at.desc`);
  if (!Array.isArray(rows)) return jsonApi({error:"Unable to load products from Supabase"}, 502);
  const data = rows.map(p => ({...p, image_endpoint:`${SITE_URL}/api/product-image/${encodeURIComponent(p.id)}?index=0`}));
  return jsonApi(data, 200, 30);
}

async function productBySlugApiResponse(slug) {
  const p = await productBySlug(slug);
  if (!p) return jsonApi({error:"Product not found"},404);
  return jsonApi(p,200,0);
}

async function siteSettingsApiResponse() {
  const rows = await supabaseGet("site_settings?id=eq.main_settings&select=id,header_fa,header_en,header_ar,header_zh,header_ru,contact_email,contact_phone,about_text,about_text_fa,about_text_en,about_text_ar,about_text_zh,about_text_ru,catalog_intro_fa,catalog_intro_en,catalog_intro_ar,catalog_intro_zh,catalog_intro_ru,crypto_discount_text&limit=1");
  if (!Array.isArray(rows)) return jsonApi({error:"Unable to load site settings from Supabase"},502);
  return jsonApi(rows[0] || {},200,30);
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };
}

async function supabaseGet(path) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supabaseHeaders() });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Supabase route fetch failed", error);
    return null;
  }
}

function escHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function titleOf(p) {
  return p.name_fa || p.name_en || p.name_ar || p.name_zh || p.name_ru || "NIX-BUILDS Product";
}

function descriptionOf(p) {
  return p.seo_description ||
    p.description_fa ||
    p.description_en ||
    `${titleOf(p)} — محصول طراحی و تولید شده توسط NIX-BUILDS.`;
}

function imageOf(p) {
  let gallery = [];
  try {
    gallery = Array.isArray(p.image_gallery) ? p.image_gallery : JSON.parse(p.image_gallery || "[]");
  } catch {}
  return p.image_data || gallery[0] || "";
}

function productUrl(p) {
  return `${SITE_URL}/product/${encodeURIComponent(p.slug || `product-${p.id}`)}`;
}

function categoryUrl(line) {
  const key = String(line || '').toLowerCase();
  return `${SITE_URL}/#${key}`;
}

function productSchema(p) {
  const images = [];
  const primary = imageOf(p);
  if (primary && primary.length < 700000) images.push(primary);

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": titleOf(p),
    "description": descriptionOf(p),
    "url": productUrl(p),
    "sku": String(p.id),
    "brand": {"@type":"Brand","name":"NIX-BUILDS"},
    "category": p.product_line || "3D Printed Product",
    "mainEntityOfPage": {"@type":"WebPage","@id":productUrl(p)}
  };

  if (p.seo_tags) data.keywords = p.seo_tags;
  if (primary) data.image = [`${SITE_URL}/api/product-image/${encodeURIComponent(p.id)}?index=0`];

  return data;
}

function breadcrumbsSchema(p) {
  return {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"NIX-BUILDS","item":SITE_URL + "/"},
      {"@type":"ListItem","position":2,"name":p.product_line || "Products","item":categoryUrl(p.product_line)},
      {"@type":"ListItem","position":3,"name":titleOf(p),"item":productUrl(p)}
    ]
  };
}


function lineName(line) {
  return line || "Products";
}

const STATIC_PAGES = {
  "/about": {
    title: "درباره NIX-BUILDS | طراحی و ساخت محصولات مدرن",
    description: "آشنایی با NIX-BUILDS؛ برند طراحی و تولید محصولات کاربردی و مدرن با پرینت سه‌بعدی و ساخت دیجیتال.",
    h1: "درباره NIX-BUILDS",
    body: `<p>NIX-BUILDS یک برند طراحی و ساخت است که روی محصولات کاربردی، مدرن و قابل تولید با فناوری‌های ساخت دیجیتال تمرکز دارد.</p><h2>لاین‌های NIX-BUILDS</h2><div class="route-links"><a class="route-link" href="/#nix-home" data-filter-link="NIX-HOME"><strong>NIX-HOME</strong><br>محصولات خانه و دکور</a><a class="route-link" href="/#nix-gear" data-filter-link="NIX-GEAR"><strong>NIX-GEAR</strong><br>ابزار و تجهیزات کاربردی</a><a class="route-link" href="/#nix-care" data-filter-link="NIX-CARE"><strong>NIX-CARE</strong><br>محصولات مراقبت و زندگی روزمره</a></div><h2>طراحی با تمرکز بر کاربرد</h2><p>هدف ما ترکیب فرم، عملکرد و ساخت دیجیتال برای ارائه محصولاتی است که هم ظاهر حرفه‌ای داشته باشند و هم در استفاده روزمره مفید باشند.</p>`
  },
  "/contact": {
    title: "تماس و سفارش | NIX-BUILDS",
    description: "راه‌های تماس و ثبت سفارش محصولات NIX-BUILDS.",
    h1: "تماس و سفارش",
    body: `<p>برای پرسش درباره محصول، رنگ، مشخصات، قیمت یا ثبت سفارش می‌توانید از اطلاعات تماس زیر استفاده کنید.</p><div class="route-links"><a class="route-link" href="tel:+989030287529">📞 تلفن: 00989030287529</a><a class="route-link" href="mailto:kaveh-m@live.com">✉️ ایمیل: kaveh-m@live.com</a><a class="route-link" href="/#all" data-filter-link="ALL">🛍️ مشاهده محصولات</a></div><h2>ثبت سفارش</h2><p>در صفحه محصول، کالا را به سبد اضافه کنید و از بخش سبد خرید، درخواست سفارش را ارسال کنید. در موبایل، متن سفارش در برنامه پیامک آماده می‌شود و ارسال نهایی با تأیید شما انجام خواهد شد.</p>`
  },
  "/shipping": {
    title: "ارسال سفارش‌ها | NIX-BUILDS",
    description: "اطلاعات کلی درباره روند ثبت و ارسال سفارش‌های NIX-BUILDS.",
    h1: "ارسال سفارش",
    body: `<p>پس از دریافت درخواست سفارش، مشخصات محصول، تعداد، رنگ و روش ارسال با شما هماهنگ می‌شود.</p><h2>زمان و هزینه</h2><p>هزینه و زمان ارسال بر اساس مقصد، ابعاد سفارش و روش حمل مشخص می‌شود و پیش از نهایی شدن سفارش به شما اعلام خواهد شد.</p>`
  },
  "/returns": {
    title: "شرایط مرجوعی | NIX-BUILDS",
    description: "شرایط کلی بررسی و مرجوعی سفارش‌های NIX-BUILDS.",
    h1: "شرایط مرجوعی",
    body: `<p>در صورت وجود ایراد در محصول یا مغایرت با سفارش، پیش از هر اقدامی با NIX-BUILDS تماس بگیرید تا وضعیت سفارش بررسی شود.</p><h2>محصولات سفارشی</h2><p>برای محصولات تولیدشده با مشخصات یا اندازه سفارشی، شرایط مرجوعی ممکن است متفاوت باشد و قبل از تولید با مشتری هماهنگ خواهد شد.</p>`
  },
  "/privacy": {
    title: "حریم خصوصی | NIX-BUILDS",
    description: "سیاست کلی حریم خصوصی و استفاده از اطلاعات در وب‌سایت NIX-BUILDS.",
    h1: "حریم خصوصی",
    body: `<p>NIX-BUILDS اطلاعاتی را که برای پاسخ‌گویی به درخواست سفارش یا پشتیبانی لازم است، در چارچوب عملکرد سایت استفاده می‌کند.</p><p>اطلاعات ورود مدیر برای مدیریت داخلی سایت است و نباید با دیگران به اشتراک گذاشته شود. اطلاعات پرداخت آنلاین در این نسخه مستقیماً توسط سایت پردازش نمی‌شود.</p>`
  },
  "/terms": {
    title: "قوانین و شرایط استفاده | NIX-BUILDS",
    description: "قوانین و شرایط کلی استفاده از سایت و ثبت سفارش در NIX-BUILDS.",
    h1: "قوانین و شرایط",
    body: `<p>استفاده از سایت به معنی پذیرش قوانین عمومی آن است. مشخصات، قیمت و شرایط هر سفارش پیش از نهایی شدن با مشتری هماهنگ می‌شود.</p><h2>اطلاعات محصول</h2><p>تصاویر و توضیحات برای معرفی محصول هستند و ممکن است در رنگ، بافت یا جزئیات ساخت با نمونه واقعی تفاوت جزئی داشته باشند.</p>`
  }
};

const CATEGORY_INFO = {
  "nix-home": { line:"NIX-HOME", title:"NIX-HOME | محصولات خانه و دکور مدرن", description:"محصولات NIX-HOME؛ اشیای کاربردی و دکوراتیو با طراحی مدرن و ساخت دیجیتال.", intro:"مجموعه‌ای از محصولات کاربردی و دکوراتیو برای خانه، با تمرکز بر طراحی مینیمال و ساخت با پرینت سه‌بعدی." },
  "nix-gear": { line:"NIX-GEAR", title:"NIX-GEAR | ابزار و تجهیزات کاربردی", description:"محصولات NIX-GEAR؛ ابزارها و تجهیزات کاربردی طراحی‌شده برای استفاده روزمره و پروژه‌های ساخت.", intro:"محصولات کاربردی NIX-GEAR برای ابزار، کارگاه، ساخت و استفاده روزمره." },
  "nix-care": { line:"NIX-CARE", title:"NIX-CARE | محصولات مراقبت و زندگی روزمره", description:"محصولات NIX-CARE؛ راهکارهای طراحی‌شده برای مراقبت شخصی و نیازهای روزمره.", intro:"محصولات NIX-CARE با تمرکز بر حمل آسان، استفاده روزمره و طراحی کاربردی." }
};

async function productsByLine(line) {
  const rows = await supabaseGet(`products?product_line=eq.${encodeURIComponent(line)}&slug=not.is.null&select=id,slug,name_fa,name_en,created_at,seo_description,description_fa,description_en,product_line,price_usdt&order=created_at.desc&limit=100`);
  return Array.isArray(rows) ? rows : [];
}

function routeShell(source, meta, bodyHtml, canonicalPath, schemaExtra = "") {
  const canonical = `${SITE_URL}${canonicalPath}`;
  let out = source;
  const title = escHtml(meta.title);
  const desc = escHtml(meta.description.slice(0,170));
  for (const [regex,repl] of [
    [/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`],
    [/<meta name="description"[^>]*>/i, `<meta name="description" content="${desc}">`],
    [/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escHtml(canonical)}">`],
    [/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}">`],
    [/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${desc}">`],
    [/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${escHtml(canonical)}">`]
  ]) out = out.replace(regex,repl);
  const schemas = `<script type="application/ld+json" id="routeSchema">${schemaExtra}</script>`;
  out = out.replace('</head>', `${schemas}\n</head>`);
  out = out.replace('<body>', '<body class="route-page">');
  const content = `<main class="route-content" data-route-path="${escHtml(canonicalPath)}" style="display:none;"><div class="route-card"><div class="product-breadcrumbs"><a href="/" data-internal-route="/">NIX-BUILDS</a> / <span id="routeBreadcrumbTitle">${escHtml(meta.h1)}</span></div><h1 id="routeTitle">${escHtml(meta.h1)}</h1><div id="routeBody">${bodyHtml}</div></div></main>`;
  const placeholder = '<section id="serverProductSEO" class="server-product-seo" aria-label="Product information" style="display:none;"></section>';
  if (out.includes(placeholder)) out = out.replace(placeholder, content);
  else out = out.replace('</body>', `${content}</body>`);
  return out;
}

async function staticRouteResponse(pathname, source) {
  if (pathname === "/products") {
    const rows = await supabaseGet(`products?slug=not.is.null&select=id,slug,name_fa,name_en,created_at,seo_description,description_fa,description_en,product_line&order=created_at.desc&limit=100`);
    const products = Array.isArray(rows) ? rows : [];
    const links = products.map(p => `<a class="route-link" href="${escHtml(productUrl(p))}"><strong>${escHtml(titleOf(p))}</strong><br><small>${escHtml(p.product_line||"Product")}</small></a>`).join('');
    const body = `<p>فهرست محصولات NIX-BUILDS شامل محصولات طراحی‌شده برای خانه، ابزار و زندگی روزمره است.</p><div class="route-links">${links || '<p>در حال حاضر محصولی برای نمایش وجود ندارد.</p>'}</div>`;
    const schema = safeJson({"@context":"https://schema.org","@type":"CollectionPage","name":"NIX-BUILDS Products","url":`${SITE_URL}/products`,"mainEntity":{"@type":"ItemList","itemListElement":products.map((p,i)=>({"@type":"ListItem","position":i+1,"name":titleOf(p),"url":productUrl(p)}))}});
    const meta = {title:"محصولات NIX-BUILDS | فروشگاه محصولات پرینت سه‌بعدی",description:"مشاهده محصولات NIX-BUILDS و لاین‌های NIX-HOME، NIX-GEAR و NIX-CARE.",h1:"محصولات NIX-BUILDS"};
    return routeShell(source,meta,body,"/products",schema);
  }
  const catMatch = pathname.match(/^\/category\/(nix-home|nix-gear|nix-care)\/?$/i);
  if (catMatch) {
    const key = catMatch[1].toLowerCase(); const info=CATEGORY_INFO[key];
    const products = await productsByLine(info.line);
    const links=products.map(p=>`<a class="route-link" href="${escHtml(productUrl(p))}"><strong>${escHtml(titleOf(p))}</strong><br><small>${escHtml(p.seo_description || p.description_fa || p.description_en || '')}</small></a>`).join('');
    const body=`<p>${escHtml(info.intro)}</p><div class="route-links">${links || '<p>محصولی در این لاین ثبت نشده است.</p>'}</div>`;
    const schema=safeJson({"@context":"https://schema.org","@type":"CollectionPage","name":info.title,"description":info.description,"url":`${SITE_URL}/category/${key}`,"mainEntity":{"@type":"ItemList","itemListElement":products.map((p,i)=>({"@type":"ListItem","position":i+1,"name":titleOf(p),"url":productUrl(p)}))}});
    return routeShell(source,{title:info.title,description:info.description,h1:info.line},body,`/category/${key}`,schema);
  }
  if (STATIC_PAGES[pathname]) {
    const meta=STATIC_PAGES[pathname];
    const schema=safeJson({"@context":"https://schema.org","@type":"WebPage","name":meta.title,"description":meta.description,"url":`${SITE_URL}${pathname}`,"isPartOf":{"@type":"WebSite","name":"NIX-BUILDS","url":SITE_URL+"/"}});
    return routeShell(source,meta,meta.body,pathname,schema);
  }
  return null;
}

function relatedLinksHtml(related) {
  if (!Array.isArray(related) || !related.length) return "";
  const links = related.map(r => `<a href="${escHtml(productUrl(r))}"><strong>${escHtml(titleOf(r))}</strong><br><small>${escHtml(r.product_line || "Product")}</small></a>`).join("");
  return `<div class="related-products"><h2>محصولات مرتبط</h2><div class="related-products-grid">${links}</div></div>`;
}

function decodeImageData(value) {
  if (!value) return null;
  const s = String(value);
  let mime = 'image/jpeg';
  let b64 = s;
  const m = s.match(/^data:([^;,]+);base64,(.*)$/s);
  if (m) { mime = m[1] || mime; b64 = m[2]; }
  try {
    const bin = atob(b64.replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return {bytes,mime};
  } catch { return null; }
}

async function productImageResponse(id, index, request) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url), {method:'GET'});
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const rows = await supabaseGet(`products?id=eq.${encodeURIComponent(id)}&select=id,image_data,image_gallery&limit=1`);
  const p = Array.isArray(rows) ? rows[0] : null;
  if (!p) return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  let gallery=[];
  try { gallery=Array.isArray(p.image_gallery)?p.image_gallery:JSON.parse(p.image_gallery||'[]'); } catch {}
  const n=Math.max(0,Number(index)||0);
  const value=n===0?(p.image_data||gallery[0]):gallery[n-1];
  if(!value) return new Response('Image not found',{status:404,headers:{'cache-control':'no-store'}});
  if(/^https?:\/\//i.test(String(value))){
    try { const r=await fetch(value); if(!r.ok)return new Response('Image unavailable',{status:502}); const h=new Headers(r.headers); h.set('cache-control','public,max-age=86400,s-maxage=604800'); return new Response(r.body,{status:r.status,headers:h}); } catch { return new Response('Image unavailable',{status:502}); }
  }
  const d=decodeImageData(value);
  if(!d)return new Response('Invalid image',{status:415,headers:{'cache-control':'no-store'}});
  const response = new Response(d.bytes,{status:200,headers:{'content-type':d.mime,'cache-control':'public,max-age=86400,s-maxage=604800,immutable','x-content-type-options':'nosniff'}});
  try { await cache.put(cacheKey, response.clone()); } catch {}
  return response;
}

function injectProductSEO(html, p, related = []) {
  const title = p.seo_title || `${titleOf(p)} | NIX-BUILDS`;
  const description = descriptionOf(p).replace(/\s+/g, " ").slice(0, 170);
  const canonical = productUrl(p);
  const image = imageOf(p);
  const imageEndpoint = `${SITE_URL}/api/product-image/${encodeURIComponent(p.id)}?index=0`;
  const schema = productSchema(p);
  const breadcrumbs = breadcrumbsSchema(p);
  const clientProduct = { ...p };
  delete clientProduct.image_data;
  delete clientProduct.image_gallery;
  let galleryCount = 0;
  try { galleryCount = (Array.isArray(p.image_gallery) ? p.image_gallery : JSON.parse(p.image_gallery || "[]")).filter(Boolean).length; } catch {}
  clientProduct.image_endpoint = imageEndpoint;
  clientProduct.image_count = 1 + galleryCount;
  const productJson = safeJson(clientProduct);

  const replacements = [
    [/<title>[\s\S]*?<\/title>/i, `<title>${escHtml(title)}</title>`],
    [/<meta name="description"[^>]*>/i, `<meta name="description" content="${escHtml(description)}">`],
    [/<meta name="keywords"[^>]*>/i, `<meta name="keywords" content="${escHtml(p.seo_tags || titleOf(p))}">`],
    [/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escHtml(canonical)}">`],
    [/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escHtml(title)}">`],
    [/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escHtml(description)}">`],
    [/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${escHtml(canonical)}">`],
    [/<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="product">`],
    [/<meta name="twitter:card"[^>]*>/i, `<meta name="twitter:card" content="summary_large_image">`]
  ];

  let out = html;
  for (const [regex, replacement] of replacements) {
    if (regex.test(out)) out = out.replace(regex, replacement);
  }

  if (image && image.length < 700000) {
    const ogImage = `<meta property="og:image" content="${escHtml(imageEndpoint)}">`;
    const twImage = `<meta name="twitter:image" content="${escHtml(imageEndpoint)}">`;
    out = out.replace("</head>", `${ogImage}\n${twImage}\n</head>`);
  }

  const serverSeo = `
    <script type="application/ld+json" id="serverProductSchema">${safeJson(schema)}</script>
    <script type="application/ld+json" id="serverBreadcrumbSchema">${safeJson(breadcrumbs)}</script>
    <script>window.__NIX_PRODUCT__=${productJson};</script>
  `;

  out = out.replace("</head>", `${serverSeo}\n</head>`);

  // Server-visible product content. This is real HTML, not only client-side JS.
  const seoBody = `
    <section class="server-product-seo" aria-label="Product information" style="display:none;">
      <div class="server-product-seo-card">
        <div class="product-breadcrumbs"><a href="/">NIX-BUILDS</a> / ${escHtml(p.product_line || "Product")}</div>
        <h1>${escHtml(titleOf(p))}</h1>
        <p>${escHtml(descriptionOf(p)).replace(/\n/g,"<br>")}</p>
        ${p.price_usdt ? `<div class="seo-price">${escHtml(p.price_usdt)} USDT</div>` : ""}
        ${image ? `<img src="${escHtml(imageEndpoint)}" alt="${escHtml(titleOf(p))}" loading="eager" decoding="async">` : ""}
        ${relatedLinksHtml(related)}
      </div>
    </section>
  `;

  out = out.replace(
    '<section id="serverProductSEO" class="server-product-seo" aria-label="Product information" style="display:none;"></section>',
    seoBody
  );
  out = out.replace('<body>', '<body class="product-route">');

  return out;
}

async function productBySlug(slug) {
  const encoded = encodeURIComponent(slug);
  const rows = await supabaseGet(
    `products?slug=eq.${encoded}&select=${encodeURIComponent(PRODUCT_SELECT)}&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : null;
}

async function sitemapResponse() {
  const rows = await supabaseGet(
    `products?select=id,slug,created_at,name_fa,name_en&slug=not.is.null&order=created_at.desc`
  );

  const urls = [
    `<url><loc>${SITE_URL}/</loc></url>`,




    `<url><loc>${SITE_URL}/about</loc></url>`,
    `<url><loc>${SITE_URL}/contact</loc></url>`,
    `<url><loc>${SITE_URL}/shipping</loc></url>`,
    `<url><loc>${SITE_URL}/returns</loc></url>`,
    `<url><loc>${SITE_URL}/privacy</loc></url>`,
    `<url><loc>${SITE_URL}/terms</loc></url>`
  ];

  for (const p of (Array.isArray(rows) ? rows : [])) {
    urls.push(
      `<url><loc>${escHtml(productUrl(p))}</loc>${p.created_at ? `<lastmod>${new Date(p.created_at).toISOString()}</lastmod>` : ""}</url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type":"application/xml; charset=UTF-8",
      "cache-control":"public, max-age=300, s-maxage=900"
    }
  });
}

function robotsResponse() {
  return new Response(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Sitemap: ${SITE_URL}/sitemap.xml
`,
    {
      headers: {
        "content-type":"text/plain; charset=UTF-8",
        "cache-control":"public, max-age=3600, s-maxage=86400"
      }
    }
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") return robotsResponse();
    if (url.pathname === "/sitemap.xml") return sitemapResponse();

    // Search/filter URLs are for users, not indexable landing pages.
    if (url.pathname === "/" && url.searchParams.has("q")) {
      const response = await env.ASSETS.fetch(request);
      if (!response.ok) return response;
      let text = await response.text();
      text = text.replace(/<meta name="robots"[^>]*>/i, '<meta name="robots" content="noindex, follow">');
      return new Response(text, {status: response.status, headers: {"content-type":"text/html; charset=UTF-8","cache-control":"no-store"}});
    }

    const pathname = url.pathname.replace(/\/$/, "") || "/";
    const assetPaths = new Set(["/index.html","/manifest.webmanifest","/sw.js","/icon.svg"]);
    if (assetPaths.has(url.pathname)) return env.ASSETS.fetch(request);

    if (url.pathname === "/api/products") return productsApiResponse();
    const productSlugApi = url.pathname.match(/^\/api\/product-by-slug\/([^/]+)\/?$/i);
    if (productSlugApi) return productBySlugApiResponse(decodeURIComponent(productSlugApi[1]));
    if (url.pathname === "/api/site-settings") return siteSettingsApiResponse();

    const imageMatch = url.pathname.match(/^\/api\/product-image\/([^/]+)\/?$/i);
    if (imageMatch) {
      const idx = Number(url.searchParams.get('index') || '0');
      return productImageResponse(decodeURIComponent(imageMatch[1]), idx, request);
    }

    // Product URLs are handled before generic static routes. This guarantees that a
    // copied product URL never falls through to the homepage or a generic route.
    const match = url.pathname.match(/^\/product\/([^/]+)\/?$/i);
    if (match) {
      const slug = decodeURIComponent(match[1]);
      const product = await productBySlug(slug);
      if (!product) {
        return new Response("Product not found", {
          status: 404,
          headers: {"content-type":"text/plain; charset=UTF-8","cache-control":"no-store"}
        });
      }
      const assetResponse = await env.ASSETS.fetch(new Request(new URL("/index.html", url), { method:"GET", headers:request.headers }));
      if (!assetResponse.ok) return new Response("Site asset unavailable", {status:503, headers:{"content-type":"text/plain; charset=UTF-8"}});
      const relatedRows = await supabaseGet(`products?product_line=eq.${encodeURIComponent(product.product_line || "")}&slug=not.is.null&id=neq.${encodeURIComponent(product.id)}&select=id,slug,name_fa,name_en,product_line&order=created_at.desc&limit=4`);
      const related = Array.isArray(relatedRows) ? relatedRows : [];
      const rendered = injectProductSEO(await assetResponse.text(), product, related);
      return new Response(rendered, {status:200, headers:{"content-type":"text/html; charset=UTF-8","cache-control":"no-store","vary":"Accept-Encoding"}});
    }

    if (pathname === '/products') return Response.redirect(`${SITE_URL}/#all`, 301);
    const oldCategory = pathname.match(/^\/category\/(nix-home|nix-gear|nix-care)\/?$/i);
    if (oldCategory) return Response.redirect(`${SITE_URL}/#${oldCategory[1].toLowerCase()}`, 301);

    const sourceAsset = await env.ASSETS.fetch(new Request(new URL("/index.html", url), { method:"GET", headers:request.headers }));
    if (sourceAsset.ok) {
      try {
        const staticResponse = await staticRouteResponse(pathname, await sourceAsset.clone().text());
        if (staticResponse) return new Response(staticResponse, {status:200, headers:{"content-type":"text/html; charset=UTF-8","cache-control":"no-store"}});
      } catch (error) {
        console.error("Static route render failed", pathname, error);
      }
    }

    // Preserve old shared/indexed links such as /?product=7.
    if (url.pathname === "/" && url.searchParams.has("product")) {
      const legacyId = url.searchParams.get("product");
      if (/^\d+$/.test(legacyId || "")) {
        const rows = await supabaseGet(
          `products?id=eq.${encodeURIComponent(legacyId)}&select=id,slug&limit=1`
        );
        const p = Array.isArray(rows) ? rows[0] : null;
        if (p?.slug) return Response.redirect(productUrl(p), 301);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
