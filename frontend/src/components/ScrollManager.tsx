import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolling between pages: a new page starts at the top, and a link with a hash ("/#family", "/visit#pickup") scrolls
 * to that section once it is on the page. Sections can arrive late (lazy pages, data that loads first), so the target
 * is looked for again for a short while. The sticky header is allowed for with scroll-margin-top in the styles.
 */
export function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const lastPath = useRef(pathname);
  useEffect(() => {
    const newPage = lastPath.current !== pathname;
    lastPath.current = pathname;
    // A filter or sort on the same page (only the query changes) keeps the visitor where they are.
    if (!hash) { if (newPage) window.scrollTo({ top: 0 }); return; }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    const find = () => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (tries++ < 40) timer = window.setTimeout(find, 50);
    };
    let timer = window.setTimeout(find, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, key]);
  return null;
}
