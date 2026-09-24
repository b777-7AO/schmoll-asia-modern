/* Run inside the Elementor editor (post.php?post=ID&action=elementor) via the
   browser JS console: replaces the whole page content with one full-width
   container holding an HTML widget that carries site/wp/wp-media-<lang>.html.
   Set window.__SAP_LANG before running. Returns a JSON summary. */
(async () => {
  const LANG = window.__SAP_LANG || "en";
  const url = `https://b777-7ao.github.io/schmoll-asia-modern/wp/wp-media-${LANG}.html?t=${Date.now()}`;
  const html = await (await fetch(url, { cache: "no-store" })).text();
  if (!html.includes('id="sap-media"')) throw new Error("fragment fetch failed: " + html.slice(0, 80));
  const root = elementor.getPreviewContainer();
  const before = root.children.map((c) => c.id + ":" + c.model.get("elType"));
  const useContainer = !!(elementorCommon.config.experimentalFeatures && elementorCommon.config.experimentalFeatures.container === "active")
    || before.some((s) => s.endsWith(":container"));
  for (const c of [...root.children]) $e.run("document/elements/delete", { container: c });
  let parent;
  const zero = { unit: "px", top: "0", right: "0", bottom: "0", left: "0", isLinked: true };
  if (useContainer) {
    parent = $e.run("document/elements/create", { container: root, model: { elType: "container", settings: { content_width: "full", padding: zero, margin: zero } } });
  } else {
    const sec = $e.run("document/elements/create", { container: root, model: { elType: "section", settings: { layout: "full_width", gap: "no", padding: zero, margin: zero } } });
    parent = sec.children[0];
  }
  $e.run("document/elements/create", { container: parent, model: { elType: "widget", widgetType: "html", settings: { html } } });
  $e.internal("document/save/set-is-modified", { status: true });
  await $e.run("document/save/update");
  const after = root.children.map((c) => c.id + ":" + c.model.get("elType") + "/" + c.children.length);
  return JSON.stringify({ post: elementor.config.document.id, lang: LANG, before, after, bytes: html.length });
})();
