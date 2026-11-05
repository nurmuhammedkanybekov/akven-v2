import { useId } from "react";

/**
 * The two Kyrgyz ornaments the shop uses, sparingly and only where they mean something.
 * Oimo band: a chain of rhombuses, the "shelf" the hero socks stand on and the top edge of the footer.
 * Kochkor muyuz (ram's horns): a mark of strength and a good household, used before the family's story.
 */
export function OimoBand({ className }: { className?: string }) {
  const id = `oimo-${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} width="100%" height="16" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="48" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 8H15M33 8H48" stroke="currentColor" strokeWidth="1" />
          <path d="M24 1.5L30.5 8L24 14.5L17.5 8Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <path d="M24 5.2L26.8 8L24 10.8L21.2 8Z" fill="currentColor" />
          <path d="M15 8l-2.5-2.5M15 8l-2.5 2.5M33 8l2.5-2.5M33 8l2.5 2.5" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="16" fill={`url(#${id})`} />
    </svg>
  );
}

/** One ram's horn pair (кочкор мүйүз), as the pen's centreline: the same horns as the logo's gold ornament. */
export const HORN_LINE = "M27 -53C34 -49 42 -58 36 -68C28 -80 4 -72 6 -52C8 -32 40 -20 47 1C54 -20 86 -32 88 -52C90 -72 66 -80 58 -68C52 -58 60 -49 67 -53";

/**
 * A band of ram's horns, as on the edge of a shyrdak (felt carpet): pairs turned up and down in turn, joined by a
 * thread, drawn in by the pen when its section arrives (CSS: .av-hornband).
 */
export function HornBand({ className, count = 7 }: { className?: string; count?: number }) {
  const W = 110, H = 96;
  return (
    <svg className={`av-hornband${className ? ` ${className}` : ""}`} viewBox={`0 0 ${W * count} ${H}`} aria-hidden="true" focusable="false">
      <path className="av-hornband__thread" d={`M0 ${H / 2}H${W * count}`} pathLength={1} />
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={i % 2 ? `translate(${i * W + 8 + 94} ${H / 2 - 2}) rotate(180) scale(0.52)` : `translate(${i * W + 8 + 6} ${H / 2 + 2}) scale(0.52)`}
          style={{ "--i": i } as React.CSSProperties}>
          <path d={HORN_LINE} pathLength={1} />
          <path className="av-hornband__gem" d="M47 -70L52 -63L47 -56L42 -63Z" />
        </g>
      ))}
    </svg>
  );
}
