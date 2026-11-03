/**
 * Rows that scroll sideways (shelf tabs, sections, occasions, the fitting room's rail, recently seen, notes on a phone)
 * fade out at the edge that has more to show, so a cut-off "Gift b" reads as "there is more this way". Each row gets
 * data-scroll-start / data-scroll-end while there is more before / after what is visible; CSS draws the fade. Plain
 * DOM and a mask image, so it works the same in Safari, Firefox and Chrome. A row that fits gets neither.
 */
const ROWS = ".av-tabs, .av-occasions, .av-fr__rail, .av-seen__line, .av-recent, .av-shelfbar, .av-notes__board, .av-chips";

function update(el: Element) {
  const max = el.scrollWidth - el.clientWidth;
  const more = max > 2;
  el.toggleAttribute("data-scroll-start", more && el.scrollLeft > 2);
  el.toggleAttribute("data-scroll-end", more && el.scrollLeft < max - 2);
}

export function installScrollHints() {
  if (typeof ResizeObserver === "undefined" || typeof MutationObserver === "undefined") return;
  const watched = new WeakSet<Element>();
  const resized = new ResizeObserver((entries) => entries.forEach((e) => update(e.target)));
  let frame = 0;
  const scan = () => {
    frame = 0;
    document.querySelectorAll(ROWS).forEach((el) => {
      if (!watched.has(el)) { watched.add(el); resized.observe(el); }
      update(el);
    });
  };
  const later = () => { if (!frame) frame = requestAnimationFrame(scan); };
  // New rows arrive with every page and every filter; their content changes their width.
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("scroll", (e) => {
    const el = e.target;
    if (el instanceof Element && el.matches(ROWS)) update(el);
  }, { capture: true, passive: true });
  window.addEventListener("resize", later, { passive: true });
  later();
}
