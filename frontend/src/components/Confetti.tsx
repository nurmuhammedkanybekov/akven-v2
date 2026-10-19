import { useEffect, useState } from "react";

const COLOURS = ["#c9a24b", "#1f2a44", "#b8323a", "#8fb1cf", "#a7cbb8", "#e7b4c4", "#efece4"];

/**
 * A short burst of paper, once, when an order is paid: little rectangles and socks' worth of colour falling from the
 * top of the page, gone after three seconds. Nothing at all with reduced motion. Decoration only.
 */
export function Confetti({ pieces = 48 }: { pieces?: number }) {
  const [on, setOn] = useState(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (!on) return;
    const id = window.setTimeout(() => setOn(false), 3600);
    return () => window.clearTimeout(id);
  }, [on]);
  if (!on) return null;
  return (
    <div className="av-confetti" aria-hidden="true">
      {Array.from({ length: pieces }, (_, i) => {
        // A fixed spread rather than Math.random, so the burst looks the same in every screenshot and test.
        const x = (i * 37) % 100, delay = (i * 53) % 700, spin = ((i * 71) % 720) - 360, drift = ((i * 29) % 160) - 80;
        return (
          <i key={i} style={{ left: `${x}%`, background: COLOURS[i % COLOURS.length], animationDelay: `${delay}ms`,
            "--spin": `${spin}deg`, "--drift": `${drift}px`, "--w": `${6 + (i % 4) * 2}px` } as React.CSSProperties} />
        );
      })}
    </div>
  );
}
