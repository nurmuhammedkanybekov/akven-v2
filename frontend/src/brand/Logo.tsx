import { useId } from "react";
import { MARK, markMarkup } from "./mark";
import { LOGO } from "./logo.generated";

interface LogoProps {
  /** "full" = the mark and AK&VEN on one line, "stacked" = the mark above AK&VEN and the tagline, "mark" = the AV alone. */
  variant?: "full" | "stacked" | "mark";
  /** Brushed-gold gradient, for large placements on dark backgrounds. Otherwise the logo takes the text colour. */
  metallic?: boolean;
  /** Rendered height in px or any CSS length. Width follows the logo's proportions. */
  height?: number | string;
  className?: string;
  /** The heart ampersand writes itself with the pen when the logo appears (still under reduced motion). */
  write?: boolean;
}

/**
 * The AK&VEN logo as inline SVG outlines: no font, no network request, colours from CSS (currentColor). The ampersand
 * takes --logo-amp when a page sets it (gold in the header and footer), otherwise the same colour as the rest. The
 * markup is built from the generated outlines and the mark's geometry only.
 */
export function Logo({ variant = "full", metallic = false, height = 28, className, write = false }: LogoProps) {
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const fill = metallic ? `url(#${id}-g)` : "currentColor";
  // Writing: the filled heart is shown through a mask, a wide stroke along the pen's own path that draws itself in.
  const pen = write && LOGO.ampLine;
  const amp = (t: string) =>
    (pen ? `<mask id="${id}-w" maskUnits="userSpaceOnUse" x="-1000" y="-400" width="3000" height="800"><path class="av-logo-pen" d="${LOGO.ampLine}" pathLength="1" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round"/></mask>` : "") +
    `<path transform="${t}" style="fill:${metallic ? fill : "var(--logo-amp, currentColor)"}" d="${LOGO.amp}"${pen ? ` mask="url(#${id}-w)"` : ""}/>`;
  const defs = metallic
    ? `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#edd79c"/><stop offset=".5" stop-color="#c9a24b"/><stop offset="1" stop-color="#9a772b"/></linearGradient></defs>`
    : "";
  let viewBox: string, aspect: number, body: string;
  if (variant === "mark") {
    viewBox = MARK.viewBox;
    aspect = MARK.w / MARK.h;
    body = markMarkup(fill, id);
  } else if (variant === "stacked") {
    ({ viewBox, aspect } = LOGO.stacked);
    body = `<g transform="${LOGO.stacked.mark}">${markMarkup(fill, id)}</g>` +
      `<path transform="${LOGO.stacked.word}" fill="${fill}" d="${LOGO.word}"/>${amp(LOGO.stacked.word)}<path transform="${LOGO.stacked.tag}" fill="${fill}" d="${LOGO.tag}"/>`;
  } else {
    ({ viewBox, aspect } = LOGO.horizontal);
    body = `<g transform="${LOGO.horizontal.mark}">${markMarkup(fill, id)}</g><path transform="${LOGO.horizontal.word}" fill="${fill}" d="${LOGO.word}"/>${amp(LOGO.horizontal.word)}`;
  }
  const style = { height, width: typeof height === "number" ? height * aspect : `calc(${height} * ${aspect})` };
  return (
    <svg role="img" aria-label="AK&VEN" viewBox={viewBox} style={style} className={className} fill="none"
      dangerouslySetInnerHTML={{ __html: defs + body }} />
  );
}
