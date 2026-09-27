/* Run inside the Elementor editor of a header or footer template (approved by
   Julian 2026-09-27). Expects the generated fragments in localStorage
   "sapChrome" ({"header-en": "...", "footer-en": "...", ...}).
   Header: the whole template becomes one zero-height section with the HTML widget.
   Footer: the block with the contact form stays untouched (including its
   hCaptcha field), the old link / copyright blocks go; two HTML widgets follow
   (#sap-ft brand + links + stylesheet, #sap-fb copyright line). The stylesheet
   lays the three blocks out as one grey footer with the form as its right panel. Footer forms without an hCaptcha field get the same
   field the English form has (stored from template 58 in "sapHcField").
   The previous content is kept in localStorage "sapBackup_<id>" and in the
   Elementor revisions. */
window.__sapChromeApply = async () => {
  for (let i = 0; i < 80 && !(window.elementor && elementor.getPreviewContainer && elementor.getPreviewContainer() && elementor.getPreviewContainer().children); i++) await new Promise((r) => setTimeout(r, 500));
  const HEAD = { 60: "en", 4411: "zh", 5179: "zh-hk", 5350: "ko", 5554: "ms", 5845: "th" };
  const FOOT = { 58: "en", 4511: "zh", 5272: "zh-hk", 5353: "ko", 5562: "ms", 5849: "th", 6647: "vi" };
  const VI = { "Let's get in touch": "Hãy kết nối", "Provide us with your details and our team will contact you!": "Cung cấp thông tin của bạn và đội ngũ của chúng tôi sẽ liên hệ!", "*Your email is safe with us, we don't spam.": "*Email của bạn được bảo mật, chúng tôi không gửi thư rác.", "Name": "Tên", "Email": "Email", "Company Name": "Tên công ty", "Company": "Tên công ty", "Connect": "Kết nối" };
  const id = elementor.config.document.id;
  const kind = HEAD[id] ? "header" : FOOT[id] ? "footer" : null;
  if (!kind) return { id, err: "not a known header/footer template" };
  const lang = HEAD[id] || FOOT[id];
  const html = JSON.parse(localStorage.getItem("sapChrome") || "{}")[kind + "-" + lang];
  if (!html || html.indexOf(kind === "header" ? 'id="sap-hd"' : 'id="sap-ft"') < 0) return { id, err: "fragment missing" };
  const root = elementor.getPreviewContainer();
  const collect = () => { const a = []; const walk = (c) => { a.push(c); (c.children || []).forEach(walk); }; root.children.forEach(walk); return a; };
  let all = collect();
  const existing = all.find((c) => c.model.get("widgetType") === "html" && /id="sap-(hd|ft)"/.test(c.settings.get("html") || ""));
  const log = { id, kind, lang, bytes: html.length };
  const zero = { unit: "px", top: "0", right: "0", bottom: "0", left: "0", isLinked: true };
  const addWidget = (at, code) => {
    const sec = $e.run("document/elements/create", { container: root, model: { elType: "section", settings: { layout: "full_width", gap: "no", padding: zero, margin: zero } }, options: at == null ? {} : { at } });
    const col = sec.children[0];
    $e.run("document/elements/settings", { container: col, settings: { padding: zero, margin: zero, space_between_widgets: 0 } });
    $e.run("document/elements/create", { container: col, model: { elType: "widget", widgetType: "html", settings: { html: code } } });
  };
  if (existing) {
    $e.run("document/elements/settings", { container: existing, settings: { html } });
    log.mode = "updated existing widget";
  } else {
    // convenience copy only: the Elementor revisions are the real restore path
    try { localStorage.setItem("sapBackup_" + id, JSON.stringify(elementor.elements.toJSON())); log.backup = "localStorage + revision"; } catch (e) { log.backup = "revision only (localStorage full)"; }
    if (kind === "header") {
      log.removed = root.children.length;
      for (const c of [...root.children]) $e.run("document/elements/delete", { container: c });
      addWidget(0, html);
    } else {
      const inner = all.filter((c) => c.model.get("elType") === "section" && c.model.get("isInner"));
      const hasForm = (c) => { let f = false; const w = (x) => { if (x.model.get("widgetType") === "form") f = true; (x.children || []).forEach(w); }; w(c); return f; };
      const drop = inner.filter((c) => !hasForm(c));
      if (inner.length - drop.length !== 1) return { id, err: "unexpected footer structure", inner: inner.length, drop: drop.length };
      log.removed = drop.length;
      for (const c of drop) $e.run("document/elements/delete", { container: c });
      addWidget(null, html);
    }
    log.mode = "replaced";
  }

  if (kind === "footer") {
    // copyright line: its own widget, third block of the footer
    const bottom = JSON.parse(localStorage.getItem("sapChrome") || "{}")["footerbottom-" + lang];
    if (!bottom || bottom.indexOf('id="sap-fb"') < 0) return { id, err: "bottom fragment missing: nothing saved" };
    all = collect();
    const fb = all.find((c) => c.model.get("widgetType") === "html" && /id="sap-fb"/.test(c.settings.get("html") || ""));
    if (fb) { $e.run("document/elements/settings", { container: fb, settings: { html: bottom } }); log.bottom = "updated"; }
    else { addWidget(null, bottom); log.bottom = "added"; }
    all = collect();
    const form = all.find((c) => c.model.get("widgetType") === "form");
    if (!form) return { id, err: "form widget missing after edit: nothing saved" };
    const fields = form.settings.get("form_fields");
    const hc = fields.models.find((m) => m.get("field_type") === "hcaptcha");
    if (hc) {
      log.hcaptcha = "present (kept as is)";
      if (lang === "en") localStorage.setItem("sapHcField", JSON.stringify(hc.toJSON()));
    } else {
      const stored = JSON.parse(localStorage.getItem("sapHcField") || "null");
      const ins = $e.commands.getAll().find((c) => /repeater\/insert$/.test(c));
      if (stored && ins) {
        const model = Object.assign({}, stored, { _id: elementorCommon.helpers.getUniqueId().slice(0, 7), custom_id: "field_" + elementorCommon.helpers.getUniqueId().slice(0, 7) });
        $e.run(ins, { container: form, name: "form_fields", model });
        log.hcaptcha = "added (copy of the English form's field), fields now: " + form.settings.get("form_fields").models.map((m) => m.get("field_type")).join(",");
      } else log.hcaptcha = "MISSING and could not be added (no stored field or no insert command)";
    }
    if (lang === "vi") {
      log.translated = 0;
      for (const c of all) {
        const wt = c.model.get("widgetType");
        if (wt === "heading") { const t = (c.settings.get("title") || "").trim(); if (VI[t]) { $e.run("document/elements/settings", { container: c, settings: { title: VI[t] } }); log.translated++; } }
        if (wt === "form") {
          const b = (c.settings.get("button_text") || "").trim(); if (VI[b]) { $e.run("document/elements/settings", { container: c, settings: { button_text: VI[b] } }); log.translated++; }
          for (const m of c.settings.get("form_fields").models) for (const k of ["placeholder", "field_label"]) { const v = (m.get(k) || "").trim(); if (VI[v]) { m.set(k, VI[v]); log.translated++; } }
        }
      }
    }
  }

  $e.internal("document/save/set-is-modified", { status: true });
  const p = (async () => { try { await $e.run("document/save/update"); return "ok"; } catch (e) { return "save error: " + String((e && e.message) || e); } })();
  window.__sapSaveP = p;
  log.saved = await Promise.race([p, new Promise((r) => setTimeout(() => r("still saving"), 36000))]);
  log.tree = root.children.map((c) => c.model.get("elType") + "[" + c.children.map((k) => k.children.map((x) => x.model.get("widgetType") || x.model.get("elType")).join(",")).join("|") + "]");
  return log;
};
