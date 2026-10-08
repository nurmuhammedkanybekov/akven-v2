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
