#!/usr/bin/env node
/* Generates the header and footer of the new design for the live WordPress site:
   one HTML-widget fragment per header / footer template.
     site/wp/wp-header-<lang>.html   (en also carries the Vietnamese markup:
                                      Vietnamese pages use the English template)
     site/wp/wp-footer-<lang>.html          (brand + link columns + footer stylesheet)
     site/wp/wp-footer-bottom-<lang>.html   (copyright line)
   The contact form itself stays an Elementor form widget in the footer template;
   the stylesheet places it inside the grey footer as the right-hand panel.
   Links and labels come from content/wp-nav.json (taken from the live menus,
   every URL checked). Usage: node build/wp-chrome.js */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const NAV = JSON.parse(read("content/wp-nav.json"));
const LANGS = ["en", "zh", "zh-hk", "ko", "ms", "th", "vi"];
const UP = "https://www.schmoll-asia.com/wp-content/uploads";
const LOGO = `${UP}/2026/09/schmoll-asia-pacific-logo.png`;
const LOGO_WHITE = `${UP}/2026/09/schmoll-asia-pacific-logo-white.png`;
const WECHAT_QR = `${UP}/2026/09/schmoll-asia-pacific-wechat-qr.png`; // square crop of the live site's QR

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const href = (u) => esc(encodeURI(u));
const minCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "").trim();
const minJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\n\s*\n/g, "\n").trim();

const CSS = read("build/wp-chrome.css");
const cut = CSS.indexOf("/* ------------------------------------------------------------------ footer */");
const CSS_HEADER = minCss(CSS.slice(0, cut));
const CSS_FOOTER = minCss(CSS.slice(cut));
const JS = minJs(read("build/wp-chrome-runtime.js"));

const CARET = '<svg class="hd-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';
const GLOBE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" stroke="currentColor" stroke-width="1.8"/></svg>';

/* ---------- header ---------- */
const menuItem = (it) => {
  if (!it.children) return `<li><a href="${href(it.url)}">${esc(it.label)}</a></li>`;
  return `<li class="has-dd"><a href="${href(it.url)}" aria-haspopup="true">${esc(it.label)}${CARET}</a>`
    + `<button type="button" class="hd-tog" aria-expanded="false" aria-label="${esc(it.label)}">${CARET}</button>`
    + `<div class="hd-dd">${it.children.map((c) => `<a href="${href(c.url)}">${esc(c.label)}</a>`).join("")}</div></li>`;
};
const headerInner = (lang) => {
  const n = NAV[lang];
  return `<a class="hd-logo" href="${href(n.home)}" aria-label="Schmoll Asia Pacific"><img src="${LOGO}" alt="Schmoll Asia Pacific" width="144" height="58"></a>
<nav class="hd-nav" aria-label="Primary"><ul class="hd-menu">${n.items.map(menuItem).join("")}</ul><div class="hd-mconnect"><a class="hd-connect" href="${href(n.contact)}">${esc(n.labels.connect)}</a></div></nav>
<div class="hd-right"><div class="hd-lang"><button type="button" class="hd-lang__btn" aria-haspopup="true" aria-expanded="false" aria-label="${esc(n.labels.language)}">${GLOBE}</button><div class="hd-lang__menu">${LANGS.map((l) => `<a href="${href(NAV[l].home)}" data-l="${l}" lang="${l}">${esc(NAV[l].name)}<span>${NAV[l].tag}</span></a>`).join("")}</div></div><a class="hd-connect" href="${href(n.contact)}">${esc(n.labels.connect)}</a><button type="button" class="hd-burger" aria-label="${esc(n.labels.menu)}" aria-expanded="false"><span></span><span></span><span></span></button></div>`;
};
const header = (lang, also = []) => `<style>${CSS_HEADER}</style>
<div id="sap-hd" data-lang="${lang}" lang="${lang}"><div class="hd-in">${headerInner(lang)}</div>${also.map((l) => `<template data-lang="${l}">${headerInner(l)}</template>`).join("")}</div>
<script>${JS}</script>
`;

/* ---------- footer ---------- */
const TRACE = "M-24 44 H252 l22 22 H500 l22 -22 H918 l22 22 H1166 l22 -22 H1464";
const VIAS = [[274, 66], [522, 44], [940, 66], [1188, 44]];
// the routed net at the top edge, as a background image of the footer
const PCB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 96" preserveAspectRatio="xMidYMid meet" fill="none"><style>.s{stroke-dasharray:.8 99.2;animation:a 12s linear infinite}@keyframes a{to{stroke-dashoffset:-100}}@media (prefers-reduced-motion:reduce){.s{animation:none}}</style><path d="${TRACE}" pathLength="100" stroke="rgba(255,255,255,.16)" stroke-width="1"/><path class="s" d="${TRACE}" pathLength="100" stroke="#C11819" stroke-width="2.2" stroke-linecap="round"/>${VIAS.map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="7" fill="#4D4D4D" stroke="rgba(255,255,255,.34)" stroke-width="1.5"/><circle r="2.5" fill="#3B3B3B" stroke="#C11819" stroke-width="1"/></g>`).join("")}</svg>`;
const PCB_URI = "data:image/svg+xml," + encodeURIComponent(PCB_SVG).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
const CSS_FOOTER_FINAL = CSS_FOOTER.replace("PCBSVG", PCB_URI);

const footer = (lang) => {
  const n = NAV[lang]; const f = n.footer; const t = n.labels;
  const a = (it) => `<a href="${href(it.url)}">${esc(it.label)}</a>`;
  return `<style>${CSS_FOOTER_FINAL}</style>
<div id="sap-ft" data-lang="${lang}" lang="${lang}">
<div class="ft-top"><div class="ft-brand"><img class="ft-logo" src="${LOGO_WHITE}" alt="Schmoll Asia Pacific" width="114" height="46"><p class="ft-tag">${esc(t.tagline)}</p></div><div class="ft-wechat"><span class="ft-tick">${esc(t.wechat)}</span><img src="${WECHAT_QR}" alt="Schmoll Asia Pacific WeChat QR code" width="92" height="92" loading="lazy"></div></div>
<div class="ft-cols">
<div class="ft-col"><h4>${esc(t.channels)}</h4>${a(f.about)}${a(f.products)}${a(f.team)}${a(f.media)}</div>
<div class="ft-col"><h4>${esc(t.legal)}</h4><a href="${href(f.terms)}">${esc(t.terms)}</a><a href="${href(f.privacy)}">${esc(t.privacy)}</a></div>
<div class="ft-col"><h4>${esc(t.questions)}</h4><a href="${href(n.contact)}">${esc(t.contact)}</a>${a(f.careers)}<a class="ft-mail" href="mailto:sales@schmoll-asia.com">sales@schmoll-asia.com</a><a class="ft-mail" href="mailto:career@schmoll-asia.com">career@schmoll-asia.com</a></div>
</div>
</div>
`;
};
const footerBottom = (lang) => `<div id="sap-fb" data-lang="${lang}" lang="${lang}"><span>© <span data-year>2026</span> Schmoll Asia Pacific · ${esc(NAV[lang].labels.rights)}</span></div>
<script>(function(){var y=document.querySelector("#sap-fb [data-year]");if(y)y.textContent=new Date().getFullYear();})();</script>
`;

fs.mkdirSync(path.join(ROOT, "site/wp"), { recursive: true });
for (const lang of LANGS) {
  if (lang !== "vi") {
    const h = header(lang, lang === "en" ? ["vi"] : []);
    fs.writeFileSync(path.join(ROOT, `site/wp/wp-header-${lang}.html`), h);
    console.log("header", lang, (h.length / 1024).toFixed(1) + " KB");
  }
  const f = footer(lang);
  fs.writeFileSync(path.join(ROOT, `site/wp/wp-footer-${lang}.html`), f);
  fs.writeFileSync(path.join(ROOT, `site/wp/wp-footer-bottom-${lang}.html`), footerBottom(lang));
  console.log("footer", lang, (f.length / 1024).toFixed(1) + " KB");
}
