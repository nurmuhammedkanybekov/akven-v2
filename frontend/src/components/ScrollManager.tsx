import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Where each visited page was scrolled to, by history entry, so Back returns to the same place. */
const positions = new Map<string, number>();
/** The page and history entry seen last. Kept outside the component: the error boundary around the pages starts
 * afresh on every page, and with it this component, so a ref would always already hold the new page. */
const last = { path: null as string | null, key: "" };

/**
 * Scrolling between pages:
 * - a link to another page opens it at the top, at once (never a smooth scroll: the page smooth-scrolls by default,
 *   and a smooth scroll to the top was cut short when the new page's parts arrived, leaving the visitor where they
 *   had been on an earlier visit);
 * - Back and Forward return to where that page was left;
 * - a link with a hash ("/#family", "/visit#pickup") scrolls to that section once it is on the page (sections can
 *   arrive late, so it is looked for again for a short while; the sticky header is allowed for in the styles);
 * - a filter or sort on the same page (only the query changes) keeps the visitor where they are.
 */
export function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const type = useNavigationType();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const save = () => positions.set(last.key, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  useLayoutEffect(() => {
    const newPage = last.path !== null && last.path !== pathname;
    last.path = pathname;
    last.key = key;
    if (hash) return;
    if (!newPage && type !== "POP") return;
    const target = type === "POP" ? positions.get(key) ?? 0 : 0;
    const go = () => window.scrollTo({ top: target, left: 0, behavior: "instant" as ScrollBehavior });
    go();
    // A page that loads its parts after the first paint is taller a moment later: place it again until it settles.
    let n = 0, timer = 0;
    const again = () => { go(); if (++n < 12 && Math.abs(window.scrollY - target) > 2) timer = window.setTimeout(again, 50); };
    timer = window.setTimeout(again, 30);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, key, type]);

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0, timer = 0;
    const find = () => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (tries++ < 40) timer = window.setTimeout(find, 50);
    };
    timer = window.setTimeout(find, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, key]);
  return null;
}
