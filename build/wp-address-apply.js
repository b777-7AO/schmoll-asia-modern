/* Run inside the Elementor editor of a CONTACT page (post.php?post=ID&action=elementor) via Safari "do JavaScript".
   Replaces the old Hong Kong office address in every widget setting string of the open document and saves.
   Old:  Room 1803, 18/F, Chinachem Exchange Square, 1 Hoi Wan Street, Quarry Bay, Hong Kong
   New:  Suite 2002, 20/F, Two Chinachem Exchange Square, No. 388 King’s Road, Hong Kong   (client, 08.11.2026) */
(async function () {
  try {
    if (!window.elementor || !window.$e || !elementor.documents || !elementor.documents.getCurrent()) return document.title = 'ADDR:' + JSON.stringify({ err: 'editor not ready' });
    const REPL = [
      [/Room 1803,\s*18\/F,\s*Chinachem Exchange Square,\s*1 Hoi Wan Street,\s*Quarry Bay,\s*Hong Kong/gi, 'Suite 2002, 20/F, Two Chinachem Exchange Square, No. 388 King’s Road, Hong Kong'],
      [/Room 1803,\s*18\/F,\s*Chinachem Exchange Square/gi, 'Suite 2002, 20/F, Two Chinachem Exchange Square'],
      [/1 Hoi Wan Street,\s*Quarry Bay/gi, 'No. 388 King’s Road'],
    ];
    let hits = 0; const touched = [];
    const fix = (val) => { if (typeof val !== 'string') return val; let v = val; REPL.forEach(([re, to]) => { if (re.test(v)) { v = v.replace(re, to); hits++; } re.lastIndex = 0; }); return v; };
    const walkSettings = (obj) => { if (!obj || typeof obj !== 'object') return obj; if (Array.isArray(obj)) return obj.map(walkSettings); const out = {}; for (const k of Object.keys(obj)) out[k] = typeof obj[k] === 'string' ? fix(obj[k]) : walkSettings(obj[k]); return out; };
    const errs = [];
    const walk = (model) => {
      try {
        const settings = model.get('settings'); const json = settings && settings.toJSON ? settings.toJSON() : (settings && typeof settings === 'object' ? JSON.parse(JSON.stringify(settings)) : {});
        const before = JSON.stringify(json); const after = walkSettings(json);
        if (JSON.stringify(after) !== before) { const c = elementor.getContainer(model.get('id')); if (c) { $e.run('document/elements/settings', { container: c, settings: after }); touched.push(model.get('id')); } else errs.push('no container ' + model.get('id')); }
      } catch (e) { errs.push(String(e).slice(0, 80)); }
      const kids = model.get('elements'); if (kids && kids.forEach) kids.forEach(walk);
    };
    elementor.documents.getCurrent().container.model.get('elements').forEach(walk);
    if (!touched.length) return document.title = 'ADDR:' + JSON.stringify({ ok: 'nothing to change', id: elementor.documents.getCurrentId(), hits, errs: errs.slice(0, 3) });
    $e.internal('document/save/set-is-modified', { status: true });
    await $e.run('document/save/update');
    document.title = 'ADDR:' + JSON.stringify({ ok: 'saved', id: elementor.documents.getCurrentId(), widgets: touched.length, hits, errs: errs.slice(0, 3), modified: elementor.saver.isEditorChanged() });
  } catch (e) { document.title = 'ADDR:' + JSON.stringify({ err: String(e && e.stack || e).slice(0, 300) }); }
})();
