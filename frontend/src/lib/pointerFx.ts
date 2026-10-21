/**
 * Where the pointer entered a button, as CSS variables (--px, --py in percent), so the button's colour can grow out
 * from that point instead of fading in. One listener for the whole page; nothing to do on touch or keyboard, where
 * the fill simply grows from the middle.
 */
export function installPointerFx() {
  if (typeof document === "undefined") return;
  const set = (e: PointerEvent) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>(".av-btn");
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--py", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  document.addEventListener("pointerover", set, { passive: true });
  document.addEventListener("pointerout", set, { passive: true });
}
