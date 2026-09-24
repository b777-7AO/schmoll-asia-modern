/* Run from any logged-in wp-admin page (browser console). Applies build/wp-seo-meta.json
   (served from gh-pages at /wp/wp-seo-meta.json) to AIOSEO via its REST endpoint.
   Resolves URL path -> post id through the public WP REST API. Returns a summary. */
(async () => {
  const GH = "https://b777-7ao.github.io/schmoll-asia-modern/wp/wp-seo-meta.json?t=" + Date.now();
  const META = await (await fetch(GH, { cache: "no-store" })).json();
  const nonce = (window.wpApiSettings && wpApiSettings.nonce) || (window.aioseo && aioseo.nonce);
  if (!nonce) throw new Error("no REST nonce on this page");
  const ids = {};
  for (const type of ["pages", "posts"]) {
    for (let p = 1; p < 8; p++) {
      const r = await fetch(`/wp-json/wp/v2/${type}?per_page=100&page=${p}&_fields=id,link`, { credentials: "include" });
      if (!r.ok) break;
      const list = await r.json();
      for (const it of list) ids[decodeURI(it.link.replace("https://www.schmoll-asia.com", ""))] = it.id;
      if (list.length < 100) break;
    }
  }
  const done = [], missing = [], failed = [];
  for (const [path, m] of Object.entries(META)) {
    if (path.startsWith("_")) continue;
    const id = ids[path];
    if (!id) { missing.push(path); continue; }
    const body = { id, title: m.title, description: m.description };
    const r = await fetch("/wp-json/aioseo/v1/post", { method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.success !== false) done.push(id); else failed.push(path + ":" + r.status + ":" + JSON.stringify(j).slice(0, 80));
    await new Promise((s) => setTimeout(s, 250));
  }
  return JSON.stringify({ done: done.length, missing, failed });
})();
