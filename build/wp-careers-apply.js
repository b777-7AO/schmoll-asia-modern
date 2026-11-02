#!/usr/bin/env node
/* Builds the per-page Elementor editor scripts that insert the careers
   fragment (site/wp/wp-careers-<lang>.html) into the live careers pages.
   Output: build/_careers-apply/<lang>.js, run inside the Elementor editor
   of that page (post.php?post=ID&action=elementor) via Safari do JavaScript.
   EN + zh already have a "Latest Position Offerings" section: the HTML widget
   goes into that container right after the heading. The other five pages
   have no such section: a new container with a heading (cloned from the
   page's own "Scan or Click" elementskit heading) + the HTML widget is
   created before the "Scan or Click and Join Us" container.
   Usage: node build/wp-careers-apply.js */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(__dirname, "_careers-apply");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = {
  // EN + zh: the existing "Latest Position Offerings" row is heading | content | photo,
  // too narrow for the cards -> full-width container right below it (no extra heading).
  en:    { id: 106,  mode: "new", before: "52768f9", relocate: true },
  zh:    { id: 4869, mode: "new", before: "52768f9", relocate: true },
  "zh-hk": { id: 5065, mode: "new", before: "52768f9", cloneHeading: "8d288df", title: "最新職位空缺" },
  ko:    { id: 5286, mode: "new", before: "52768f9", cloneHeading: "8d288df", title: "최신 채용 공고" },
  ms:    { id: 5496, mode: "new", before: "52768f9", cloneHeading: "8d288df", title: "Jawatan Terkini" },
  th:    { id: 5787, mode: "new", before: "52768f9", cloneHeading: "8d288df", title: "ตำแหน่งงานล่าสุด" },
  vi:    { id: 6660, mode: "new", before: "52768f9", cloneHeading: "8d288df", title: "Vị trí tuyển dụng mới nhất" },
};

for (const [lang, p] of Object.entries(PAGES)) {
  const html = fs.readFileSync(path.join(ROOT, "site/wp", `wp-careers-${lang}.html`), "utf8");
  const js = `(async function(){
  try {
    var HTML = ${JSON.stringify(html)};
    var P = ${JSON.stringify(p)};
    if (!window.elementor || !window.$e) return JSON.stringify({err:'editor not ready'});
    if (!elementor.documents || !elementor.documents.getCurrent()) return JSON.stringify({err:'no document'});
    if (String(elementor.documents.getCurrentId()) !== String(P.id)) return JSON.stringify({err:'wrong document', id: elementor.documents.getCurrentId()});
    // already applied? (re-run updates the existing widget in place)
    var existing = null;
    elementor.documents.getCurrent().container.model.get('elements').forEach(function walk(m){
      if (m.get('widgetType')==='html' && String(m.get('settings').get('html')||'').indexOf('id="sap-jobs"')>-1) existing = m;
      (m.get('elements')||[]).forEach(walk);
    });
    if (existing && P.relocate) {
      $e.run('document/elements/delete', {container: elementor.getContainer(existing.get('id'))});
      existing = null;
    }
    if (existing) {
      $e.run('document/elements/settings', {container: elementor.getContainer(existing.get('id')), settings:{html: HTML}});
      $e.internal('document/save/set-is-modified', {status:true});
      await $e.run('document/save/update');
      return JSON.stringify({ok:'updated existing widget', id: existing.get('id'), modified: elementor.saver.isEditorChanged()});
    }
    var root = elementor.getContainer('document');
    var kids = root.model.get('elements');
    var ids = kids.map(function(m){return m.get('id')});
    var targetContainer, at;
    if (P.mode === 'existing') {
      var sec = elementor.getContainer(P.section);
      if (!sec) return JSON.stringify({err:'section not found', ids: ids});
      // insert right after the inner container that holds the heading widget
      var inner = sec.model.get('elements'); var idx = -1;
      inner.forEach(function(m,i){ var hit=false; (function walk(x){ if(x.get('id')===P.heading) hit=true; (x.get('elements')||[]).forEach(walk); })(m); if(hit) idx=i; });
      if (idx < 0) return JSON.stringify({err:'heading not found in section'});
      targetContainer = sec; at = idx + 1;
    } else {
      var bi = ids.indexOf(P.before);
      if (bi < 0) return JSON.stringify({err:'before-container not found', ids: ids});
      var newSec = $e.run('document/elements/create', {container: root, model:{elType:'container', settings:{content_width:'boxed', padding:{unit:'px',top:'10',right:'0',bottom:'40',left:'0',isLinked:false}}}, options:{at: bi}});
      // heading cloned from the page's own elementskit heading (keeps its typography)
      var at0 = 0;
      if (P.title) {
        var src = elementor.getContainer(P.cloneHeading);
        var hs = src ? JSON.parse(JSON.stringify(src.model.get('settings').toJSON())) : {};
        delete hs._element_id;
        hs.ekit_heading_title = P.title;
        $e.run('document/elements/create', {container: newSec, model:{elType:'widget', widgetType: src ? src.model.get('widgetType') : 'heading', settings: src ? hs : {title: P.title}}});
        at0 = 1;
      }
      targetContainer = newSec; at = at0;
    }
    var w = $e.run('document/elements/create', {container: targetContainer, model:{elType:'widget', widgetType:'html', settings:{html: HTML}}, options:{at: at}});
    $e.internal('document/save/set-is-modified', {status:true});
    await $e.run('document/save/update');
    return JSON.stringify({ok:'inserted', widget: w && w.id, mode: P.mode, modified: elementor.saver.isEditorChanged()});
  } catch (e) { return JSON.stringify({err: String(e && e.stack || e)}); }
})().then(function(r){ document.title = 'SAPJOBS:' + r; });
`;
  fs.writeFileSync(path.join(OUT, lang + ".js"), js);
  console.log(lang, p.id, p.mode, js.length);
}
