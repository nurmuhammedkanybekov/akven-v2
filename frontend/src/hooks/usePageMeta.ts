import { useEffect } from "react";

/**
 * What search engines read about a page beyond its title. The shop is drawn in the browser, so these are set by the
 * page itself: Google reads them after running the page. Each is put back as it was when the page goes away.
 */
function metaTag(name: string): HTMLMetaElement {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) { tag = document.createElement("meta"); tag.name = name; document.head.appendChild(tag); }
  return tag;
}

/** The page's own description (a product's first sentence, not the shop's general one). */
export function usePageDescription(text: string | null | undefined) {
  useEffect(() => {
    if (!text) return;
    const tag = metaTag("description");
    const before = tag.content;
    tag.content = text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
    return () => { tag.content = before; };
  }, [text]);
}

/** Keeps a page that is not there (a mistyped address) out of search results. */
export function useNoIndex() {
  useEffect(() => {
    const tag = metaTag("robots");
    const before = tag.content;
    tag.content = "noindex";
    return () => { if (before) tag.content = before; else tag.remove(); };
  }, []);
}

/** Structured data (schema.org JSON-LD): a data block, never run as a script, so the page's CSP is unaffected. */
export function useJsonLd(id: string, data: object | null) {
  const json = data ? JSON.stringify(data) : null;
  useEffect(() => {
    if (!json) return;
    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.id = id;
    // "</" cannot end the block early: the JSON is written with its "<" escaped.
    tag.textContent = json.replace(/</g, "\\u003c");
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [id, json]);
}
