/* Behaviour of the live-site header (#sap-hd): language-aware content, dropdowns,
   mobile menu, language switcher that links to the translation of the page
   being viewed (from the page's hreflang tags). No dependencies. */
(function () {
  var hd = document.getElementById("sap-hd");
  if (!hd || hd.getAttribute("data-ready")) return;
  hd.setAttribute("data-ready", "1");

  var CODES = { "en": "en", "zh-cn": "zh", "zh-hk": "zh-hk", "ko": "ko", "ms": "ms", "th": "th", "vi": "vi" };
  var seg = (location.pathname.split("/")[1] || "").toLowerCase();
  var pageLang = ["zh", "zh-hk", "ko", "ms", "th", "vi"].indexOf(seg) > -1 ? seg : "en";

  // one header template can serve a second language (Vietnamese pages use the
  // English template): swap in that language's markup
  if (pageLang !== hd.getAttribute("data-lang")) {
    var alt = hd.querySelector('template[data-lang="' + pageLang + '"]');
    if (alt) {
      hd.querySelector(".hd-in").innerHTML = alt.innerHTML;
      hd.setAttribute("data-lang", pageLang);
      hd.setAttribute("lang", pageLang);
    }
  }

  var norm = function (u) { try { var a = new URL(u, location.href); return decodeURIComponent(a.pathname).replace(/\/+$/, "") + "/"; } catch (e) { return ""; } };
  var here = norm(location.href);

  // current page marker
  hd.querySelectorAll(".hd-menu a").forEach(function (a) {
    if (norm(a.href) === here) a.setAttribute("aria-current", "page");
  });

  // language menu: link each language to the translation of this page
  var alts = {};
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (l) {
    var c = CODES[(l.getAttribute("hreflang") || "").toLowerCase()];
    if (c && l.href) alts[c] = l.href;
  });
  hd.querySelectorAll(".hd-lang__menu a").forEach(function (a) {
    var c = a.getAttribute("data-l");
    if (alts[c]) a.href = alts[c];
    if (c === pageLang) a.setAttribute("aria-current", "true");
  });

  var desktop = function () { return window.innerWidth > 1080; };
  var closeAll = function (except) {
    hd.querySelectorAll(".hd-menu > li.is-open").forEach(function (li) {
      if (li !== except) { li.classList.remove("is-open"); var t = li.querySelector(".hd-tog"); if (t) t.setAttribute("aria-expanded", "false"); }
    });
  };

  hd.querySelectorAll(".hd-menu > li.has-dd").forEach(function (li) {
    li.addEventListener("mouseenter", function () { if (desktop()) { closeAll(li); li.classList.add("is-open"); } });
    li.addEventListener("mouseleave", function () { if (desktop()) li.classList.remove("is-open"); });
    var tog = li.querySelector(".hd-tog");
    if (tog) tog.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var open = !li.classList.contains("is-open");
      closeAll(li);
      li.classList.toggle("is-open", open);
      tog.setAttribute("aria-expanded", String(open));
    });
  });

  var lang = hd.querySelector(".hd-lang");
  var langBtn = hd.querySelector(".hd-lang__btn");
  if (lang && langBtn) {
    langBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !lang.classList.contains("is-open");
      lang.classList.toggle("is-open", open);
      langBtn.setAttribute("aria-expanded", String(open));
      if (!open) langBtn.blur();
    });
  }

  var burger = hd.querySelector(".hd-burger");
  var setMobile = function (open) {
    hd.classList.toggle("is-mobile-open", open);
    document.body.classList.toggle("sap-nav-open", open);
    if (burger) burger.setAttribute("aria-expanded", String(open));
    if (!open) closeAll();
  };
  if (burger) burger.addEventListener("click", function (e) { e.stopPropagation(); setMobile(!hd.classList.contains("is-mobile-open")); });

  document.addEventListener("click", function (e) {
    if (lang && !lang.contains(e.target)) { lang.classList.remove("is-open"); if (langBtn) langBtn.setAttribute("aria-expanded", "false"); }
    if (desktop() && !e.target.closest("#sap-hd .hd-menu")) closeAll();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeAll(); setMobile(false);
    if (lang) lang.classList.remove("is-open");
    if (document.activeElement && hd.contains(document.activeElement)) document.activeElement.blur();
  });
  window.addEventListener("resize", function () { if (desktop() && hd.classList.contains("is-mobile-open")) setMobile(false); });
})();
