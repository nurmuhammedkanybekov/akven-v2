import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sections marked data-reveal slide up as they scroll into view. Everything is visible without this (the hidden start
 * state only applies once the html element has the "reveal" class), and nothing moves for people who ask for less motion.
 */
export function useReveal() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("reveal");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    const watch = () => document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    watch();
    // Pages load their sections after data arrives; look again when the page content changes.
    const mo = new MutationObserver(watch);
    const main = document.getElementById("main");
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
}

/**
 * Endless animations (the bulbs over Dordoi, socks swaying on a line, a pulsing "open now" dot) rest while their part
 * of the page is off screen and carry on when it comes back. Running them all the time kept dozens of layers busy on
 * every frame, which made scrolling and the bestseller filters stutter on phones. One-off animations are left alone.
 */
export function useCalmOffscreen() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || typeof document.getAnimations !== "function") return;
    const endless = (el: Element) => el.getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().iterations === Infinity);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) for (const a of endless(e.target)) {
        const mine = a as Animation & { __calm?: boolean };
        if (e.isIntersecting) { if (mine.__calm) { mine.__calm = false; a.play(); } }
        else if (a.playState === "running") { mine.__calm = true; a.pause(); }
      }
    }, { rootMargin: "200px 0px" });
    const watch = () => document.querySelectorAll("main section, main > div > section, footer").forEach((el) => io.observe(el));
    watch();
    const mo = new MutationObserver(() => { io.disconnect(); watch(); });
    const main = document.getElementById("main");
    if (main) mo.observe(main, { childList: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
}
