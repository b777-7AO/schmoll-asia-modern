#!/usr/bin/env python3
"""Turns the static site in ../site into a WordPress theme, an assets plugin and an import file.

    python3 wp/build_wp.py

Output (wp/dist):
  schmoll-modern.zip     theme: templates, css, js, import/content.json
  schmoll-assets.zip     plugin holding only static files: img/ and brochures/

After uploading both in wp-admin and activating the theme, an administrator runs the
import once (Appearance > Schmoll import, or POST /wp-json/sap/v1/import). The import
creates or updates every page and post by slug, so it is safe to run again after a rebuild.
"""
import html
import json
import os
import re
import shutil
import zipfile
from urllib.parse import unquote
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = ROOT / "wp" / "dist"
THEME = OUT / "schmoll-modern"
VERSION = "1.1.3"

PACK_LIMIT = 8_200_000  # the browser upload tool takes at most 10 MB per file
PACK = {}  # "img/..." or "brochures/..." -> pack number, filled by plan_packs()


def asset_url(rel):
    """Public address of a static file; files are spread over several small plugin packages."""
    n = PACK.get(unquote(rel).split("?")[0], 1)
    return f"/wp-content/plugins/schmoll-assets-{n}/{rel}"


def img(path):
    return asset_url("img/" + path)


def doc(name):
    return asset_url("brochures/" + name)


def plan_packs():
    """Spread pictures and documents over packages small enough for the upload tool."""
    files = []
    for f in sorted((SITE / "assets" / "img").rglob("*")):
        if f.is_file() and f.name != ".DS_Store" and "machines-de" not in f.parts:
            # one picture has a literal "%40" in its file name; store it decoded so its link resolves
            files.append((unquote("img/" + f.relative_to(SITE / "assets" / "img").as_posix()), f))
    for key, name in BRO_NAME.items():
        files.append(("brochures/" + name, ROOT / "wp" / "brochures" / f"{key}.pdf"))
    for slug, (_, source, name) in LEGAL_DOCS.items():
        files.append(("brochures/" + name, Path.home() / "Downloads" / source))
    # Files already on the server keep their package, so a rebuild only produces new
    # packages for new or changed files (wp/packs.json records what was deployed).
    lock_file = ROOT / "wp" / "packs.json"
    lock = json.loads(lock_file.read_text()) if lock_file.exists() else {}
    bins = {}
    fresh = []
    for rel, f in files:
        size = f.stat().st_size
        if rel in lock and lock[rel][1] == size:
            bins.setdefault(lock[rel][0], {"size": 0, "files": [], "new": False})["files"].append((rel, f))
        else:
            fresh.append((rel, f, size))
    nxt = max([v[0] for v in lock.values()] + [0]) + 1
    new_bins = []
    for rel, f, size in sorted(fresh, key=lambda x: -x[2]):
        for b in new_bins:
            if b["size"] + size <= PACK_LIMIT:
                b["files"].append((rel, f)); b["size"] += size; break
        else:
            new_bins.append({"size": size, "files": [(rel, f)], "new": True})
    for k, b in enumerate(new_bins):
        bins[nxt + k] = b
    for n, b in bins.items():
        for rel, f in b["files"]:
            PACK[rel] = n
            lock[rel] = [n, f.stat().st_size]
    lock_file.write_text(json.dumps(lock, indent=0, sort_keys=True))
    return [(n, bins[n]) for n in sorted(bins)]


ASSET_BASE = "/wp-content/themes/schmoll-modern/assets/"
ORIGIN = "https://schmoll-asia.com"

# static file -> WordPress address. Product addresses are the ones printed as QR codes
# in the brochures, so the printed codes keep working.
PAGES = {
    "index": "", "about": "pcb-drilling", "team": "team", "products": "products", "applications": "application",
    "service": "service", "careers": "careers", "contact": "contact-us", "news": "news",
    "product-eagle": "eagle-series", "product-hawk": "hawk-series", "product-falcon": "falcon-series",
    "product-rmxy": "rmxy-series", "product-raptor": "raptor-series-best-routing-pcb-equipment",
    "product-combidrill": "combi-drill-series", "product-mdi": "mdi-series", "product-xra3": "xra3-series",
    "product-automation": "automation-series", "product-probecard": "probe-card",
}
POSTS = {  # news file -> (old WordPress slug, date, category)
    "news-team-building-2026": ("schmoll-asia-pacific-team-building", "2026-06-02", "news"),
    "news-cpca-show-2026": ("cpca-show-2026-best-pcb-equipment-for-ai-data-servers", "2026-04-06", "news"),
    "news-golden-supplier-award": ("schmoll-asia-pacific-wins-golden-supplier-award-at-founder-pcb-supplier-conference", "2025-01-16", "news"),
    "news-granite": ("granite-schmolls-best-option-on-the-market", "2024-09-11", "blog"),
    "news-schmoll-asia-vs-maschinen": ("difference-between-schmoll-asia-and-schmoll-maschinen", "2024-08-22", "blog"),
    "news-wus-expansion": ("wus-printed-circuits-expansion-powered-by-schmoll-asia-pacifics-cutting-edge-technology", "2024-08-07", "blog"),
    "news-larry-gao": ("celebrating-a-strong-partnership-larry-gao-2", "2024-07-01", "blog"),
    "news-new-website": ("schmoll-asia-pacific-new-website", "2024-06-28", "news"),
    # exhibition reports: off the listings since September 2026, but their pages are kept so old links work
    "news-hkpca-2025": ("hkpca-2025-schmoll-asia-best-pcb-equipment-solutions-in-asia-30-years-anniversary", "2025-12-09", "news"),
    "news-cpca-show-2025": ("successful-participation-at-cpca-show-2025-in-shanghai", "2025-04-22", "news"),
    "news-hkpca-2024": ("schmoll-asia-pacific-concludes-a-successful-year-at-the-hkpca-show-2024", "2024-12-18", "news"),
    "news-cpca-2024": ("cpca-show-2024-a-resounding-success-for-schmoll-asia-pacific", "2024-11-26", "news"),
    "news-tpca-2024": ("schmoll-asia-pacifics-success-at-tpca-show-2024", "2024-11-07", "news"),
    "news-kpca-2024": ("celebrating-a-successful-kpca-show-2024-innovation-collaboration-and-growth", "2024-09-25", "news"),
}
BROCHURES = {  # product key -> source PDF in ~/Downloads (newest English front+back version)
    "eagle": "EN - BACKFRONT - Eagle .pdf", "hawk": "EN - BACKFRONT - HAWK.pdf", "falcon": "EN - BACKFRONT - FALCON.pdf",
    "raptor": "Raptor_Brochure .pdf", "combidrill": "EN - BACKFRONT - CombiDrill 500.pdf", "mdi": "EN - BACKFRONT - MDI.pdf",
    "xra3": "EN - BACKFRONT - XRA3.pdf", "automation": "EN - BACKFRONT - ALS.pdf", "probecard": "EN - BACKFRONT - Fixture.pdf",
    "rmxy": "EN_RMXY_Brochure_FRONTBACK.pdf",
}
BRO_NAME = {k: f"Schmoll-{n}-Brochure.pdf" for k, n in {
    "eagle": "Eagle", "hawk": "Hawk", "falcon": "Falcon", "raptor": "Raptor", "combidrill": "CombiDrill", "mdi": "MDI",
    "xra3": "XRA3", "automation": "Automation", "probecard": "ProbeCard", "rmxy": "RMXY"}.items()}
BRO_MATCH = [("eagle", "eagle"), ("hawk", "hawk"), ("falcon", "falcon"), ("raptor", "raptor"), ("combidrill", "combidrill"),
             ("mdi", "mdi"), ("xra3", "xra3"), ("als", "automation"), ("automation", "automation"), ("fixture", "probecard"),
             ("probe", "probecard"), ("rmxy", "rmxy")]
LEGAL_DOCS = {  # slug -> (title, source PDF, served name)
    "gtc-purchase": ("General Terms and Conditions of Purchase", "20231109_GTC_Purchase_SCHMOLL_ASIA_PACIFIC_2023_EN_CN-SAP_KS.pdf", "Schmoll-Asia-Pacific-GTC-Purchase.pdf"),
    "gtc-services": ("General Terms and Conditions of Service", "20231110_GTC_Service_SCHMOLL_ASIA_PACIFIC_SAP_KS.pdf", "Schmoll-Asia-Pacific-GTC-Service.pdf"),
    "non-disclosure-agreement": ("Non-Disclosure Agreement", "20221128_NDA_Customer_Supplier_limited_time_logo_encn.pdf", "Schmoll-Asia-Pacific-NDA.pdf"),
}

URL = {f: ("/" + s + "/" if s else "/") for f, s in PAGES.items()}
URL.update({f: "/" + v[0] + "/" for f, v in POSTS.items()})
NAMES = "|".join(sorted(map(re.escape, URL), key=len, reverse=True))

# Old addresses that no longer have a page of their own.
REDIRECTS = {
    "media-links": "/news/", "blog": "/news/#insights", "videos": "/news/#videos", "video-schmoll-asia-pacific": "/news/#videos",
    "ccdapplication": "/application/#ccd", "backdrilling-2": "/application/#backdrilling", "substrate": "/application/#substrate",
    "automation": "/application/#automation", "fixture-probe-card": "/application/#fixture", "xray-xra3": "/application/#xray",
    "laser-2": "/application/#laser", "electric-vehicle": "/application/#ev",
    "about": "/pcb-drilling/", "contact": "/contact-us/", "applications": "/application/", "media": "/news/",
    "eagle": "/eagle-series/", "hawk": "/hawk-series/", "falcon": "/falcon-series/", "rmxy": "/rmxy-series/", "company": "/pcb-drilling/", "job": "/careers/", "laser": "/application/#laser", "backdrilling": "/application/#backdrilling", "direct-imaging": "/mdi-series/", "xray-xra3-cn": "/application/#xray",
    "raptor-series": "/raptor-series-best-routing-pcb-equipment/", "raptor": "/raptor-series-best-routing-pcb-equipment/",
    "combidrill-series": "/combi-drill-series/", "mdi": "/mdi-series/", "xra3": "/xra3-series/", "probe-card-series": "/probe-card/",
    "cookie-policy": "/privacy-policy/",
    # 2026 show invitations existed only as short LinkedIn cross-posts
    "meet-schmoll-asia-pacific-at-kpca-show-2026": "/news/", "theca-2026-bangkok-here-we-come": "/news/",
    "celebrating-a-strong-partnership-larry-gao": "/celebrating-a-strong-partnership-larry-gao-2/",
}


def brochure_for(url):
    low = url.lower().replace("-", "").replace("_", "")
    for needle, key in BRO_MATCH:
        if needle in low:
            return doc(BRO_NAME[key])
    return None


def rewrite(s):
    """Point every link and asset reference at its WordPress address."""
    s = re.sub(r"https://julianito03\.github\.io/schmoll-asia-modern/(?=[\w-]+\.html|assets/|\"|')", ORIGIN_MARK, s)
    s = re.sub(r"(https?://(?:(?:www\.)?schmoll-asia\.com|47\.239\.40\.173)/wp-content/uploads/[^\"'\s)]+\.pdf)",
               lambda m: brochure_for(m.group(1)) or m.group(1), s)
    s = re.sub(r"(?<![\w/.-])(?:\./)?assets/(img/[^\"'\s)?#&<>]+)", lambda m: asset_url(m.group(1)), s)
    s = re.sub(r"(?<![\w/.-])(?:\./)?assets/", ASSET_BASE, s)
    s = re.sub(r"(?<![\w/.-])(" + NAMES + r")\.html", lambda m: URL[m.group(1)], s)
    s = s.replace(ORIGIN_MARK + "/", ORIGIN + "/").replace(ORIGIN_MARK, ORIGIN + "/")
    s = s.replace(ORIGIN + "//", ORIGIN + "/")
    return s


ORIGIN_MARK = "\u0001ORIGIN\u0001"
BANNER = """<section class="page-banner">
  <div class="page-banner__media"><img src="{img}" alt=""></div>
  <div class="container">
    <nav class="breadcrumb"><a href="/">Home</a><span>/</span><span>{title}</span></nav>
    <h1 style="margin-top:18px">{title}</h1>
  </div>
</section>"""


def split(file):
    s = (SITE / f"{file}.html").read_text(encoding="utf-8")
    g = lambda rx: re.search(rx, s, re.S)
    return {
        "title": html.unescape(g(r"<title>(.*?)</title>").group(1)),
        "desc": html.unescape(g(r'<meta name="description" content="(.*?)">').group(1)),
        "head": g(r'styles\.css\?v=\d+">\n(.*?)</head>').group(1),
        "main": g(r'<main id="main"[^>]*>\n?(.*)</main>').group(1),
        "scripts": g(r'main\.js\?v=\d+"></script>\n(.*?)</body>').group(1),
        "header": g(r'<header class="site-header.*?</header>').group(0),
        "footer": g(r'<footer class="site-footer.*?</footer>').group(0),
    }


def legal_page(slug):
    title, _, name = LEGAL_DOCS[slug]
    return BANNER.format(img=img("facility-2.jpg"), title=title) + f"""
<section class="section"><div class="container sap-doc">
<p class="lead">The current version of this document is available as a PDF.</p>
<p style="margin-top:28px"><a class="btn btn--lg" href="{doc(name)}" target="_blank" rel="noopener">Download PDF</a></p>
<p style="margin-top:28px">Questions about this document: <a href="mailto:sales@schmoll-asia.com">sales@schmoll-asia.com</a></p>
</div></section>"""


def pending_legal(title):
    return BANNER.format(img=img("facility-2.jpg"), title=title) + f"""
<section class="section"><div class="container sap-doc">
<p class="lead">This page is being restored and will be available again shortly.</p>
<p style="margin-top:28px">For questions in the meantime, please write to <a href="mailto:sales@schmoll-asia.com">sales@schmoll-asia.com</a>.</p>
</div></section>"""


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    (THEME / "assets").mkdir(parents=True)
    (THEME / "import").mkdir()
    bins = plan_packs()

    items = []
    shell = split("about")  # the generated header and footer are the reference
    for file, slug in PAGES.items():
        p = split(file)
        items.append({"type": "page", "slug": slug or "home", "front": not slug, "title": p["title"].split(" | ")[0] if slug else "Home",
                      "seo_title": p["title"], "desc": p["desc"], "content": rewrite(p["main"]),
                      "head": rewrite(p["head"]), "scripts": rewrite(p["scripts"]), "key": file})
    for file, (slug, date, cat) in POSTS.items():
        p = split(file)
        items.append({"type": "post", "slug": slug, "title": p["title"].rsplit(" | ", 1)[0], "seo_title": p["title"], "desc": p["desc"],
                      "date": date + "T09:00:00", "category": cat, "content": rewrite(p["main"]), "head": rewrite(p["head"]),
                      "scripts": rewrite(p["scripts"]), "key": file})
    for slug, (title, _, _) in LEGAL_DOCS.items():
        items.append({"type": "page", "slug": slug, "title": title, "seo_title": f"{title} | Schmoll Asia Pacific",
                      "desc": f"{title} of Schmoll Asia Pacific.", "content": legal_page(slug), "head": "", "scripts": "", "key": slug})
    legal_src = ROOT / "wp" / "legal"
    for slug, title in (("privacy-policy", "Privacy Policy"), ("term-of-use", "Terms of Use")):
        src = legal_src / f"{slug}.html"
        body = (BANNER.format(img=img("facility-2.jpg"), title=title) + '\n<section class="section"><div class="container sap-doc">\n' + src.read_text(encoding="utf-8") + "\n</div></section>") if src.exists() else pending_legal(title)
        items.append({"type": "page", "slug": slug, "title": title, "seo_title": f"{title} | Schmoll Asia Pacific",
                      "desc": f"{title} of Schmoll Asia Pacific.", "content": body, "head": "", "scripts": "", "key": slug,
                      "noindex": not src.exists()})

    (THEME / "import" / "content.json").write_text(json.dumps({"version": VERSION, "items": items, "redirects": REDIRECTS}, ensure_ascii=False), encoding="utf-8")

    # ---- theme assets (css, js, data, icons); pictures go to the plugin
    for sub in ("css", "js", "data"):
        if (SITE / "assets" / sub).exists():
            shutil.copytree(SITE / "assets" / sub, THEME / "assets" / sub)
    for f in (SITE / "assets").iterdir():
        if f.is_file():
            shutil.copy(f, THEME / "assets" / f.name)
    css = THEME / "assets" / "css" / "styles.css"
    css.write_text(re.sub(r"url\(\.\./img/([^)]+)\)", lambda m: "url(" + img(m.group(1)) + ")", css.read_text(encoding="utf-8")) + (ROOT / "wp" / "theme-src" / "extra.css").read_text(encoding="utf-8"), encoding="utf-8")
    for js in (THEME / "assets" / "js").glob("*.js"):
        js.write_text(rewrite(js.read_text(encoding="utf-8")), encoding="utf-8")
    main = THEME / "assets" / "js" / "main.js"
    m = main.read_text(encoding="utf-8")
    a = m.index("  /* ---------- Forms (front-end only demo) ---------- */")
    b = m.index("  /* ====", a)
    main.write_text(m[:a] + (ROOT / "wp" / "theme-src" / "forms.js").read_text(encoding="utf-8") + "\n" + m[b:], encoding="utf-8")
    for d in (THEME / "assets" / "data").glob("*.json") if (THEME / "assets" / "data").exists() else []:
        d.write_text(rewrite(d.read_text(encoding="utf-8")), encoding="utf-8")

    # ---- templates
    src = ROOT / "wp" / "theme-src"
    footer = shell["footer"]
    footer = footer.replace('<a href="#" data-i18n="foot.terms">', '<a href="/term-of-use/" data-i18n="foot.terms">') \
                   .replace('<a href="#" data-i18n="foot.privacy">', '<a href="/privacy-policy/" data-i18n="foot.privacy">') \
                   .replace('<a href="#" data-i18n="foot.cookie">', '<a href="/privacy-policy/" data-i18n="foot.cookie">')
    for f in src.glob("*.php"):
        t = f.read_text(encoding="utf-8").replace("{{VERSION}}", VERSION)
        docmap = ", ".join(f"'{rel.split('/', 1)[1]}' => {n}" for rel, n in sorted(PACK.items()) if rel.startswith("brochures/"))
        t = t.replace("{{DOCMAP}}", docmap)
        t = t.replace("{{HEADER}}", rewrite(shell["header"])).replace("{{FOOTER}}", rewrite(footer))
        (THEME / f.name).write_text(t, encoding="utf-8")
    (THEME / "style.css").write_text(f"""/*
Theme Name: Schmoll Modern
Description: Schmoll Asia Pacific website. Pages are generated from the static design in the schmoll-asia-modern repository.
Version: {VERSION}
Requires PHP: 7.4
*/
""", encoding="utf-8")
    shot = SITE / "assets" / "img" / "about-hero-cpca.jpg"
    if shot.exists():
        shutil.copy(shot, THEME / "screenshot.jpg")

    # ---- asset packages: pictures and documents only, no code
    names = ["schmoll-modern"]
    for n, b in bins:
        d = OUT / f"schmoll-assets-{n}"
        d.mkdir()
        (d / f"schmoll-assets-{n}.php").write_text(f"""<?php
/**
 * Plugin Name: Schmoll Assets {n}
 * Description: Static pictures and PDFs for the Schmoll Modern theme (package {n}). Contains no code.
 * Version: {VERSION}
 */
if (!defined('ABSPATH')) exit;
""", encoding="utf-8")
        (d / "index.php").write_text("<?php // silence\n", encoding="utf-8")
        for rel, f in b["files"]:
            (d / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(f, d / rel)
        names.append(d.name)
        if b["new"]:
            print("NEW PACKAGE to upload:", d.name)

    for name in names:
        z = OUT / f"{name}.zip"
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for f in sorted((OUT / name).rglob("*")):
                if f.is_file() and f.name != ".DS_Store":
                    zf.write(f, f.relative_to(OUT))
        print(z.name, round(z.stat().st_size / 1e6, 1), "MB")
    left = re.findall(r'(?:href|src)="(?!https?:|/|#|mailto:|tel:|data:)([^"]+)"', "".join(i["content"] + i["head"] + i["scripts"] for i in items))
    print(len(items), "items;", "unresolved relative links:", sorted(set(left))[:20])


if __name__ == "__main__":
    build()
