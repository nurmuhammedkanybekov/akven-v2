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

export function HornMark({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size * 40 / 48} viewBox="0 0 48 40" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M24 30V19" />
      <path d="M24 19C24 9 15 4 9.5 8.5C5 12.5 7.5 19 13 18.5C16.5 18 16.8 13.6 13.5 13.4" />
      <path d="M24 19C24 9 33 4 38.5 8.5C43 12.5 40.5 19 35 18.5C31.5 18 31.2 13.6 34.5 13.4" />
      <path d="M24 30l3.5 3.5L24 37l-3.5-3.5Z" />
    </svg>
  );
}

/** A thin gold rule with the horn mark in the middle; the lines draw out when it scrolls into view. */
export function HornDivider() {
  return <div className="av-divider" data-reveal aria-hidden="true"><HornMark /></div>;
}
