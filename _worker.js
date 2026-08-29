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

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };
}

async function supabaseGet(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: supabaseHeaders()
  });
  if (!response.ok) return null;
  return response.json();
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
    "category": p.product_line || "3D Printed Product"
  };

  if (p.seo_tags) data.keywords = p.seo_tags;
  if (images.length) data.image = images;

  if (p.price_usdt) {
    data.offers = {
      "@type":"Offer",
      "url":productUrl(p),
      "price":String(p.price_usdt).replace(/,/g,""),
      "priceCurrency":"USDT",
      "availability":"https://schema.org/InStock"
    };
  }

  return data;
}

function breadcrumbsSchema(p) {
  return {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"NIX-BUILDS","item":SITE_URL + "/"},
      {"@type":"ListItem","position":2,"name":p.product_line || "Products","item":SITE_URL + "/"},
      {"@type":"ListItem","position":3,"name":titleOf(p),"item":productUrl(p)}
    ]
  };
}

function injectProductSEO(html, p) {
  const title = p.seo_title || `${titleOf(p)} | NIX-BUILDS`;
  const description = descriptionOf(p).replace(/\s+/g, " ").slice(0, 170);
  const canonical = productUrl(p);
  const image = imageOf(p);
  const schema = productSchema(p);
  const breadcrumbs = breadcrumbsSchema(p);
  const productJson = safeJson(p);

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
    const ogImage = `<meta property="og:image" content="${escHtml(image)}">`;
    const twImage = `<meta name="twitter:image" content="${escHtml(image)}">`;
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
    <section class="server-product-seo" aria-label="Product information">
      <div class="server-product-seo-card">
        <div class="product-breadcrumbs"><a href="/">NIX-BUILDS</a> / ${escHtml(p.product_line || "Product")}</div>
        <h1>${escHtml(titleOf(p))}</h1>
        <p>${escHtml(descriptionOf(p)).replace(/\n/g,"<br>")}</p>
        ${p.price_usdt ? `<div class="seo-price">${escHtml(p.price_usdt)} USDT</div>` : ""}
        ${image && image.length < 700000 ? `<img src="${escHtml(image)}" alt="${escHtml(titleOf(p))}" loading="eager">` : ""}
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
    `<url><loc>${SITE_URL}/</loc></url>`
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

    const match = url.pathname.match(/^\/product\/([^/]+)\/?$/i);
    if (match) {
      const slug = decodeURIComponent(match[1]);
      const product = await productBySlug(slug);

      if (!product) {
        return new Response("Product not found", {
          status: 404,
          headers: {"content-type":"text/plain; charset=UTF-8"}
        });
      }

      if (url.pathname.endsWith("/")) {
        return Response.redirect(productUrl(product), 301);
      }

      const assetResponse = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
      if (!assetResponse.ok) return assetResponse;

      const source = await assetResponse.text();
      const rendered = injectProductSEO(source, product);

      return new Response(rendered, {
        status: 200,
        headers: {
          "content-type":"text/html; charset=UTF-8",
          "cache-control":"public, max-age=60, s-maxage=300",
          "vary":"Accept-Encoding"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
