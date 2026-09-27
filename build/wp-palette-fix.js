/* Run inside the Elementor editor of any document (page, post, header, footer):
   swaps every hardcoded off-palette red in the element settings for the brand
   palette (solid reds -> #C11819, hover shades -> #9D1314) and saves.
   The global colours themselves live in the kit (Site Settings). */
window.__sapPalette = async () => {
  for (let i = 0; i < 80 && !(window.elementor && elementor.getPreviewContainer && elementor.getPreviewContainer() && elementor.getPreviewContainer().children); i++) await new Promise((r) => setTimeout(r, 500));
  const MAP = {
    "#ff0000": "#C11819", "#ff5657": "#C11819", "#ea6b5b": "#C11819",
    "#ff0606bd": "#9D1314", "#d51414a3": "#9D1314", "#dd2020d9": "#9D1314",
    "#ff1e1ebd": "#9D1314", "#da4d4d": "#9D1314", "#f15858": "#9D1314",
  };
  const RE = /#(?:ff0606bd|d51414a3|dd2020d9|ff1e1ebd|ff0000|ff5657|ea6b5b|da4d4d|f15858)\b/ig;
  const swap = (s) => s.replace(RE, (m) => MAP[m.toLowerCase()]);
  const has = (s) => { RE.lastIndex = 0; return RE.test(s); };
  const log = { doc: elementor.config.document.id, changed: [], saved: null };
  const all = []; const walk = (c) => { all.push(c); (c.children || []).forEach(walk); };
  elementor.getPreviewContainer().children.forEach(walk);
  for (const c of all) {
    const s = c.settings.attributes;
    for (const k of Object.keys(s)) {
      const v = s[k];
      if (typeof v === "string") {
        if (has(v)) { $e.run("document/elements/settings", { container: c, settings: { [k]: swap(v) } }); log.changed.push(c.id + "." + k); }
      } else if (v && v.models) {
        for (const m of v.models) for (const mk of Object.keys(m.attributes)) {
          const mv = m.attributes[mk];
          if (typeof mv === "string" && has(mv)) { m.set(mk, swap(mv)); log.changed.push(c.id + "." + k + "[]." + mk); }
          else if (mv && typeof mv === "object" && !mv.models && has(JSON.stringify(mv))) { m.set(mk, JSON.parse(swap(JSON.stringify(mv)))); log.changed.push(c.id + "." + k + "[]." + mk + "(obj)"); }
        }
      } else if (v && typeof v === "object") {
        const j = JSON.stringify(v);
        if (has(j)) { $e.run("document/elements/settings", { container: c, settings: { [k]: JSON.parse(swap(j)) } }); log.changed.push(c.id + "." + k + "(obj)"); }
      }
    }
  }
  if (!log.changed.length) { log.saved = "nothing to change"; return log; }
  $e.internal("document/save/set-is-modified", { status: true });
  const p = (async () => { try { await $e.run("document/save/update"); return "ok"; } catch (e) { return "save error: " + String((e && e.message) || e); } })();
  window.__sapSaveP = p;
  log.saved = await Promise.race([p, new Promise((r) => setTimeout(() => r("still saving"), 36000))]);
  log.n = log.changed.length; log.changed = log.changed.slice(0, 6);
  return log;
};
window.__sapWaitSave = async () => {
  if (!window.__sapSaveP) return "no save running";
  const r = await Promise.race([window.__sapSaveP, new Promise((r) => setTimeout(() => r("still saving"), 38000))]);
  return { r, dirty: elementor.saver.isEditorChanged() };
};
