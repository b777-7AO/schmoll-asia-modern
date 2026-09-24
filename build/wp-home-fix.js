/* Run inside the Elementor editor of a HOME page (70 en, 4414 zh, 4814 zh-hk,
   4815 ko, 4816 ms, 4817 th, 4818 vi). Replaces the exhibition ticker items with
   the 2026 list (same as EN home, typo 11st->11th fixed) and swaps hardcoded
   #FF0000 -> #C11819 in every element's settings. Saves a draft and re-flags the
   document as modified; the Publish button must then be clicked in the UI. */
(async () => {
  for (let i = 0; i < 40 && !(window.elementor && elementor.getPreviewContainer && elementor.getPreviewContainer() && elementor.getPreviewContainer().children); i++) await new Promise((r) => setTimeout(r, 500));
  const ITEMS = [
    ["CPCA 2026 | March 24th-26th | 2026", "http://www.cpcashow.com"],
    ["THECA | August 26th-28th | 2026", "https://thailandelectronicscircuitasia.com"],
    ["KPCA 2026 | Sep 9th-11th | 2026", "https://www.kpcashow.com/m/eng/about.asp"],
    ["TPCA 2026 | Oct 20th-22nd | 2026", "https://www.tpcashow.com/en/"],
    ["HKPCA 2026 | Dec 2nd-4th | 2026", "https://www.hkpcashow.org/en/"],
  ];
  const cmds = $e.commands.getAll();
  const rmCmd = cmds.find((c) => /repeater\/remove$/.test(c));
  const insCmd = cmds.find((c) => /repeater\/insert$/.test(c));
  const log = { ticker: null, colors: [], skipped: [], rmCmd, insCmd };
  const all = []; const walk = (c) => { all.push(c); (c.children || []).forEach(walk); };
  elementor.getPreviewContainer().children.forEach(walk);
  for (const c of all) {
    const wt = c.model.get("widgetType") || "";
    if (wt === "wb-news-ticker" && rmCmd && insCmd) {
      const name = "ticker_custom_content_list";
      const col = c.settings.get(name); const n = col ? col.length : 0;
      for (let i = n - 1; i >= 0; i--) $e.run(rmCmd, { container: c, name, index: i });
      for (const [t, u] of ITEMS) $e.run(insCmd, { container: c, name, model: { ticker_custom_content: t, ticker_custom_content_link: { url: u, is_external: true, nofollow: false, custom_attributes: "" } } });
      log.ticker = { id: c.id, removed: n, now: c.settings.get(name).length };
    }
    const s = c.settings.attributes;
    for (const k of Object.keys(s)) {
      const v = s[k];
      if (typeof v === "string") { if (/#ff0000/i.test(v)) { $e.run("document/elements/settings", { container: c, settings: { [k]: v.replace(/#ff0000/ig, "#C11819") } }); log.colors.push(c.id + "." + k); } }
      else if (v && typeof v === "object" && !v.models) { const j = JSON.stringify(v); if (/#ff0000/i.test(j)) { $e.run("document/elements/settings", { container: c, settings: { [k]: JSON.parse(j.replace(/#ff0000/ig, "#C11819")) } }); log.colors.push(c.id + "." + k + "(obj)"); } }
      else if (v && v.models) { if (/#ff0000/i.test(JSON.stringify(v.toJSON()))) log.skipped.push(c.id + "." + k + "(repeater)"); }
    }
  }
  $e.internal("document/save/set-is-modified", { status: true });
  await $e.run("document/save/draft");
  await new Promise((r) => setTimeout(r, 1500));
  $e.internal("document/save/set-is-modified", { status: true });
  return JSON.stringify(log);
})();
