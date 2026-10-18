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
