#!/usr/bin/env node
/* Generates the WordPress "Media" page fragment (one Elementor HTML widget per
   language) from the same data the static site uses. Output: site/wp/wp-media-<lang>.html
   - News & Events / Expert Insights rows link to the live WP posts (translated
     post when one exists, English otherwise). Exhibition (event) posts before
     2026 are excluded on purpose (client decision, 2026-09-23).
   - Videos row: poster-first inline playback.
   - LinkedIn row: baked snapshot in the HTML; JS refreshes it from
     assets/data/linkedin.json on GitHub Pages (kept current by linkedin-sync.js).
   Usage: node build/wp-media.js */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const POSTS = JSON.parse(read("content/news/posts.json"));
const LI = JSON.parse(read("site/assets/data/linkedin.json"));
const VIDEOS = JSON.parse(read("content/media/videos.json")).videos;
const MAP = JSON.parse(read("build/wp-post-map.json"));
const POSTERS = fs.existsSync(path.join(ROOT, "build/wp-posters.json"))
  ? JSON.parse(read("build/wp-posters.json")) : {};

const i18nCtx = { window: {} };
vm.runInNewContext(read("site/assets/js/i18n.js"), i18nCtx);
const I18N = i18nCtx.window.SCHMOLL_I18N;

const SITE = "https://www.schmoll-asia.com";
const GH = "https://b777-7ao.github.io/schmoll-asia-modern";
const RAW = "https://raw.githubusercontent.com/b777-7AO/schmoll-asia-modern/main/site";
const LANGS = ["en", "zh", "zh-hk", "ko", "ms", "th", "vi"];
const PAGES = {
  products: { en: "/products/", zh: "/zh/产品/", "zh-hk": "/zh-hk/產品/", ko: "/ko/제품/", ms: "/ms/produk/", th: "/th/ผลิตภัณฑ์/", vi: "/vi/san-pham/" },
  contact: { en: "/contact-us/", zh: "/zh/联系我们/", "zh-hk": "/zh-hk/聯繫我們/", ko: "/ko/문의하기/", ms: "/ms/hubungi-kami/", th: "/th/ติดต่อเรา/", vi: "/vi/lien-he/" },
};
const H1 = { en: "Media", zh: "媒体", "zh-hk": "媒體", ko: "미디어", ms: "Media", th: "สื่อ", vi: "Truyền thông" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso, lang) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (["zh", "zh-hk", "ko", "th"].includes(lang)) return `${y}.${m}.${d}`;
  return `${d} ${MONTHS[+m - 1]} ${y}`;
};
const cdn = (url, w) => {
  const u = url.replace(/^https?:\/\/(www\.)?schmoll-asia\.com\//, "");
  return `https://i0.wp.com/www.schmoll-asia.com/${u}?resize=${w},${Math.round(w * 9 / 16)}&ssl=1`;
};

const LI_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.16h4.52V23H.24V8.16zM8.34 8.16h4.33v2.03h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.93V23h-4.51v-7.29c0-1.74-.03-3.98-2.42-3.98-2.43 0-2.8 1.9-2.8 3.86V23H8.34V8.16z"/></svg>';
const ARROW_R = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>';
const ARROW_L = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M14 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>';

/* ---------- post selection ---------- */
const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
// CPCA 2026 report is the 2026 exhibition story: show it under News & Events
const typeOf = (p) => (p.id === 7848 ? "event" : p.type);
const keep = (p) => !(typeOf(p) === "event" && p.date < "2026-01-01");
const visible = sorted.filter(keep);
const newsEvents = visible.filter((p) => typeOf(p) !== "insight");
const insights = visible.filter((p) => typeOf(p) === "insight");

const postThumb = (p) => {
  if (p.featured && /schmoll-asia\.com/.test(p.featured)) return cdn(p.featured, 640);
  if (p.liFeatured || (p.featured && p.featured.startsWith("assets/"))) return `${GH}/${p.featured}`;
  if (p.images && p.images[0] && /schmoll-asia\.com/.test(p.images[0])) return cdn(p.images[0], 640);
  return `${GH}/assets/img/facility-2.jpg`;
};
// Team building has no WP featured image; its LinkedIn cross-post image is the visual
const TB = LI.posts.find((p) => p.id === "7467579139282145280");
for (const p of POSTS) if (p.id === 7923 && !p.featured && TB && TB.images[0]) { p.featured = TB.images[0]; p.liFeatured = true; }

const postHref = (p, lang) => {
  const row = MAP.map[p.id] || {};
  const id = row[lang] || row.en;
  return MAP.links[id] || MAP.links[row.en];
};
const postTitle = (p, lang) => (lang !== "en" && p.translations && p.translations[lang] && p.translations[lang].title) || p.cleanTitle || p.title;

/* ---------- components ---------- */
const panel = (p, lang, t) => `
<a class="sm-panel sm-panel--img" href="${postHref(p, lang)}">
  <img src="${postThumb(p)}" alt="${esc(p.imageAlt || "")}" loading="lazy" width="640" height="360">
  <span class="sm-panel__inner">
    <span class="sm-panel__head"><time datetime="${p.date}">${fmtDate(p.date, lang)}</time><span>${esc(t["mtype." + typeOf(p)] || typeOf(p))}</span></span>
    <span class="sm-panel__title">${esc(postTitle(p, lang))}</span>
    <span class="sm-panel__more">${esc(t["m.more"] || "More")} <span aria-hidden="true">→</span></span>
  </span>
</a>`;

const videoTile = (v) => `
<div class="sm-vtile" data-video-src="${esc(v.videoUrl)}" data-video-title="${esc(v.title)}">
  <button type="button" class="sm-vtile__img" aria-label="Play: ${esc(v.title)}">
    <img src="${POSTERS[v.id] || `${GH}/${v.poster}`}" alt="" loading="lazy" width="640" height="360">
    <span class="sm-vtile__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5l12 7-12 7z" fill="currentColor"/></svg></span>
  </button>
  <span class="sm-vtile__cap">${esc(v.title)}</span>
</div>`;

const liPanel = (p, lang, t) => `
<a class="sm-panel sm-panel--img" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
  ${p.images && p.images[0] ? `<img src="${GH}/${p.images[0]}" alt="" loading="lazy" width="640" height="360" onerror="this.style.display='none'">` : ""}
  <span class="sm-panel__inner">
    <span class="sm-panel__head"><time datetime="${p.date}">${fmtDate(p.date, lang)}</time><span>${LI_ICON} LinkedIn ↗</span></span>
    <span class="sm-panel__title">${esc((p.customTitle || p.text.split("\n")[0]).slice(0, 90))}</span>
    <span class="sm-panel__more">${esc(t["li.view"] || "View post")} <span aria-hidden="true">↗</span></span>
  </span>
</a>`;
const followPanel = (t) => `
<a class="sm-panel sm-panel--follow" href="${LI.source}" target="_blank" rel="noopener noreferrer">
  <span class="sm-panel__title">${LI_ICON}&nbsp; ${esc(t["li.follow"] || "Follow on LinkedIn")}</span>
  <span class="sm-panel__more">↗</span>
</a>`;

const row = (id, label, inner, variant = "") => `
<section class="sm-row${variant ? " sm-row--" + variant : ""}" id="${id}">
  <div class="sm-container"><h2 class="sm-row__h">${esc(label)}</h2></div>
  <div class="sm-container sm-row__wrap">
    <div class="sm-row__slider"${id === "linkedin" ? ' data-li-slider' : ""}>${inner}</div>
    <button type="button" class="sm-row__prev is-hidden" aria-label="Scroll left">${ARROW_L}</button>
    <button type="button" class="sm-row__next" aria-label="Scroll right">${ARROW_R}</button>
  </div>
</section>`;

/* ---------- CSS (scoped to #sap-media) ---------- */
const CSS = read("build/wp-media.css");
/* ---------- JS ---------- */
const JS = read("build/wp-media-runtime.js");

function page(lang) {
  const t = I18N[lang] || I18N.en;
  const liPosts = LI.posts.filter((p) => !p.hidden && p.approved !== false).slice(0, 6);
  const P = (k) => SITE + encodeURI(PAGES[k][lang] || PAGES[k].en);
  return `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
<div id="sap-media" lang="${lang}" data-lang="${lang}" data-li-base="${GH}" data-li-alt="${RAW}" data-li-view="${esc(t["li.view"] || "View post")}" data-li-follow="${esc(t["li.follow"] || "Follow on LinkedIn")}" data-li-source="${LI.source}">
<header class="sm-head"><div class="sm-container">
  <h1>${esc(H1[lang])}</h1>
  <p>${esc(t["mh.sub"])}</p>
</div></header>
${row("news", t["ms.newsevents"], newsEvents.map((p) => panel(p, lang, t)).join(""))}
${row("insights", t["mf.insight"], insights.map((p) => panel(p, lang, t)).join(""), "diary")}
${row("videos", t["media.videos"], VIDEOS.map(videoTile).join(""), "video")}
${row("linkedin", t["ms.linkedin"], liPosts.map((p) => liPanel(p, lang, t)).join("") + followPanel(t), "li")}
<section class="sm-cta"><div class="sm-container sm-cta__in">
  <div><h2>${esc(t["mc.title"])}</h2><p>${esc(t["mc.body"])}</p></div>
  <div class="sm-cta__actions">
    <a class="sm-btn" href="${P("products")}">${esc(t["mc.products"])}</a>
    <a class="sm-btn sm-btn--ghost" href="${P("contact")}">${esc(t["mc.contact"])}</a>
  </div>
</div></section>
</div>
<script>${JS}</script>
`;
}

fs.mkdirSync(path.join(ROOT, "site/wp"), { recursive: true });
for (const lang of LANGS) {
  const out = page(lang);
  fs.writeFileSync(path.join(ROOT, `site/wp/wp-media-${lang}.html`), out);
  console.log(lang, (out.length / 1024).toFixed(1) + " KB", "news:", newsEvents.length, "insights:", insights.length, "li:", Math.min(6, LI.posts.length));
}
