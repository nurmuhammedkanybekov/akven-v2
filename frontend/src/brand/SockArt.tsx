import { useId, useMemo } from "react";
import { sockBounds, sockMarkup, type SockSpec } from "./sockDrawing";

export { SOCK_COLOURS, type SockCut, type SockPattern, type SockSpec } from "./sockDrawing";

/**
 * A drawn sock: the stand-in for product photos until real ones exist. The drawing itself lives in
 * sockDrawing.ts, shared with the product image script, so the hero and the product images look alike.
 * The markup is built only from the spec's own values (colours from code), each escaped.
 */
export function SockArt({ className, style, frame, ...spec }: SockSpec & {
  className?: string;
  style?: React.CSSProperties;
  /** Draw in another cut's frame, so socks of different heights line up on one leg. */
  frame?: SockSpec["cut"];
}) {
  const id = `sk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const b = sockBounds(frame ?? spec.cut);
  const key = JSON.stringify(spec);
  const html = useMemo(() => sockMarkup(spec, id), [key, id]);
  return (
    <svg viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} className={className} style={style} aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: html }} />
  );
}
