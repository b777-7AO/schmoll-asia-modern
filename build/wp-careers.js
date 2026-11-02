#!/usr/bin/env node
/* Generates the "Latest Position Offerings" fragment for the live WordPress
   careers pages (one Elementor HTML widget per language) from
   content/careers/<lang>.json. Output: site/wp/wp-careers-<lang>.html
   Style = the live site's media-page family: light grey notched panels, Jost
   caps, brand red #C11819, notched buttons (see build/wp-buttons.css).
   Usage: node build/wp-careers.js */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const LANGS = ["en", "zh", "zh-hk", "ko", "ms", "th", "vi"];
const MAIL = "career@schmoll-asia.com";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CSS = `
#sap-jobs{--red:#C11819;--red-dark:#9d1314;--g900:#333333;--g700:#4D4D4D;--g500:#7F8080;--g200:#E5E5E5;--g100:#F2F2F2;--disp:"Jost","Roboto","Helvetica Neue",Arial,sans-serif;--body:"Roboto Slab",Georgia,serif;font-family:var(--body);color:var(--g900);line-height:1.55;-webkit-font-smoothing:antialiased;max-width:1140px;margin:0 auto;padding:0 0 clamp(24px,4vw,48px)}
#sap-jobs *{box-sizing:border-box}
#sap-jobs .sj-intro{font-size:1rem;color:var(--g700);margin:0 0 clamp(20px,3vw,32px);max-width:760px}
#sap-jobs .sj-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:clamp(16px,2.5vw,28px);align-items:start}
#sap-jobs .sj-card{background:var(--g100);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,0 100%);padding:clamp(22px,3vw,34px);position:relative}
#sap-jobs .sj-card::before{content:"";position:absolute;left:0;top:0;width:6px;height:100%;background:var(--red)}
#sap-jobs .sj-kicker{font-family:var(--disp);font-weight:600;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--red);margin:0 0 10px}
#sap-jobs h3.sj-title{font-family:var(--disp);font-weight:600;font-size:clamp(1.25rem,2vw,1.6rem);line-height:1.2;text-transform:uppercase;letter-spacing:.01em;color:var(--g900);margin:0 0 10px}
#sap-jobs .sj-tag{font-size:.98rem;color:var(--g700);margin:0 0 18px}
#sap-jobs .sj-meta{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:.9rem;margin:0 0 20px;padding:14px 0;border-top:1px solid var(--g200);border-bottom:1px solid var(--g200)}
#sap-jobs .sj-meta dt{font-family:var(--disp);font-weight:600;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--g500);padding-top:3px}
#sap-jobs .sj-meta dd{margin:0}
#sap-jobs details{margin:0 0 18px}
#sap-jobs summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:10px;font-family:var(--disp);font-weight:600;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--red);padding:4px 0;user-select:none}
#sap-jobs summary::-webkit-details-marker{display:none}
#sap-jobs summary::before{content:"";width:9px;height:9px;border-right:2px solid var(--red);border-bottom:2px solid var(--red);transform:rotate(45deg) translateY(-2px);transition:transform .2s}
#sap-jobs details[open] summary::before{transform:rotate(225deg) translateY(-3px)}
#sap-jobs summary .sj-open{display:inline}
#sap-jobs summary .sj-close{display:none}
#sap-jobs details[open] summary .sj-open{display:none}
#sap-jobs details[open] summary .sj-close{display:inline}
#sap-jobs .sj-body{padding-top:14px;font-size:.93rem}
#sap-jobs .sj-body h4{font-family:var(--disp);font-weight:600;font-size:.82rem;letter-spacing:.06em;text-transform:uppercase;color:var(--red);margin:22px 0 8px;padding-top:14px;border-top:1px solid var(--g200)}
#sap-jobs .sj-body h5{font-family:var(--disp);font-weight:600;font-size:.88rem;color:var(--g900);margin:16px 0 6px}
#sap-jobs .sj-body p{margin:0 0 10px}
#sap-jobs .sj-body ul{margin:0 0 12px;padding-left:1.2em}
#sap-jobs .sj-body li{margin:0 0 6px}
#sap-jobs .sj-closing{font-family:var(--disp);font-weight:600;font-size:.95rem;color:var(--g900);margin:18px 0 0}
#sap-jobs .sj-actions{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px;margin-top:6px}
#sap-jobs a.sj-btn{display:inline-flex;align-items:center;padding:14px 26px;background:var(--red);color:#fff!important;font-family:var(--disp);font-weight:600;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);transition:background .2s}
#sap-jobs a.sj-btn:hover,#sap-jobs a.sj-btn:focus{background:var(--red-dark);color:#fff!important}
#sap-jobs .sj-note{font-size:.84rem;color:var(--g700)}
#sap-jobs .sj-note a{color:var(--red);text-decoration:none;font-weight:600}
#sap-jobs .sj-address{font-family:var(--disp);font-size:.76rem;letter-spacing:.03em;color:var(--g500);margin:clamp(18px,3vw,28px) 0 0}
@media (max-width:640px){#sap-jobs .sj-meta{grid-template-columns:1fr;gap:2px 0}#sap-jobs .sj-meta dd{margin-bottom:8px}}
`.trim();

function blocks(bs) {
  return bs.map((b) => {
    if (b.h4) return `<h5>${esc(b.h4)}</h5>`;
    if (b.p) return `<p>${esc(b.p)}</p>`;
    if (b.li) return `<ul>${b.li.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    return "";
  }).join("");
}

function card(job, ui) {
  const meta = [];
  if (job.meta.company) meta.push([ui.company, job.meta.company]);
  meta.push([ui.location, job.meta.location]);
  meta.push([ui.reportsTo, job.meta.reportsTo]);
  if (job.meta.salary) meta.push([ui.salary, job.meta.salary]);
  const mailto = `mailto:${MAIL}?subject=${encodeURIComponent(job.subject)}`;
  return `<article class="sj-card" id="sj-${job.id}">
<p class="sj-kicker">${esc(ui.kicker)}</p>
<h3 class="sj-title">${esc(job.title)}</h3>
<p class="sj-tag">${esc(job.tagline)}</p>
<dl class="sj-meta">${meta.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
<details><summary><span class="sj-open">${esc(ui.details)}</span><span class="sj-close">${esc(ui.close)}</span></summary>
<div class="sj-body">${job.sections.map((s) => `<h4>${esc(s.h)}</h4>${blocks(s.blocks)}`).join("")}
<p class="sj-closing">${esc(job.closing)}</p></div></details>
<div class="sj-actions"><a class="sj-btn" href="${mailto}">${esc(ui.apply)}</a><span class="sj-note">${esc(ui.applyNote).replace(MAIL, `<a href="mailto:${MAIL}">${MAIL}</a>`)}</span></div>
</article>`;
}

for (const lang of LANGS) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "content/careers", lang + ".json"), "utf8"));
  const html = `<!-- schmoll-asia.com careers: open positions (generated by build/wp-careers.js, ${new Date().toISOString().slice(0, 10)}) -->
<style>${CSS}</style>
<div id="sap-jobs" lang="${lang}">
<p class="sj-intro">${esc(d.ui.intro)}</p>
<div class="sj-grid">
${d.jobs.map((j) => card(j, d.ui)).join("\n")}
</div>
<p class="sj-address">${esc(d.ui.address)}</p>
</div>`;
  const out = path.join(ROOT, "site/wp", `wp-careers-${lang}.html`);
  fs.writeFileSync(out, html);
  console.log(lang, out.replace(ROOT + "/", ""), html.length, "chars");
}
