import { useEffect, useRef } from "react";

/**
 * A thread of gold yarn along the top of the page that unwinds as you read, with its ball rolling at the end. Drawn
 * with one CSS variable set on scroll, once per frame; hidden on short pages.
 */
export function YarnProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current, doc = document.documentElement;
      if (!el) return;
      const max = doc.scrollHeight - window.innerHeight;
      el.style.setProperty("--p", max > 200 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4) : "0");
      el.dataset.on = max > 200 ? "true" : "false";
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);
  return (
    <div ref={ref} className="av-yarn" aria-hidden="true">
      <span className="av-yarn__thread" />
      <span className="av-yarn__ball" />
    </div>
  );
}
