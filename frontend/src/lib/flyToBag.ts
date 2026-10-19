/**
 * The picture of what was just added flies into the bag icon in the header, and the bag gives a little bump. Uses the
 * Web Animations API on a temporary copy of the picture, so the page itself never moves. Nothing happens with reduced
 * motion, without the API (older browsers, tests), or when the bag icon is off screen.
 */
export function flyToBag(from: Element | null | undefined) {
  if (!from || typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const bag = document.querySelector<HTMLElement>("[data-bag-target]");
  const img = from instanceof HTMLImageElement ? from : from.querySelector("img");
  if (!bag || !img || typeof img.animate !== "function") return;
  const a = img.getBoundingClientRect(), b = bag.getBoundingClientRect();
  if (a.width === 0 || b.width === 0 || b.bottom < 0) return;

  const ghost = img.cloneNode() as HTMLImageElement;
  ghost.removeAttribute("id");
  ghost.alt = "";
  ghost.className = "av-fly";
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const scale = Math.max(0.06, 28 / a.width);
  const flight = ghost.animate([
    { transform: "translate(0, 0) scale(1)", opacity: 0.95, borderRadius: "12px" },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 80}px) scale(${(1 + scale) / 2.4})`, opacity: 0.9, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.2, borderRadius: "50%" },
  ], { duration: 720, easing: "cubic-bezier(.5,0,.3,1)" });
  flight.onfinish = flight.oncancel = () => {
    ghost.remove();
    bag.classList.remove("is-bump");
    void bag.offsetWidth;                                   // restart the bump if it is still running
    bag.classList.add("is-bump");
  };
}
