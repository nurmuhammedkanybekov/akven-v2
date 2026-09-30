import { useId } from "react";
import { LOGO } from "./logo.generated";

interface LogoProps {
  /** "full" = AK ♥ VEN lockup, "mark" = the heart-ampersand alone (icons, avatars). */
  variant?: "full" | "mark";
  /** Brushed-gold gradient, for large placements on dark backgrounds. Otherwise the logo takes the text colour. */
  metallic?: boolean;
  /** Rendered height in px or any CSS length. Width follows the logo's proportions. */
  height?: number | string;
  className?: string;
}

/** The Ak&Ven logo as inline SVG outlines: no font, no network request, colours from CSS (currentColor). */
export function Logo({ variant = "full", metallic = false, height = 28, className }: LogoProps) {
  const gradientId = `gold-${useId().replace(/:/g, "")}`;
  const fill = metallic ? `url(#${gradientId})` : "currentColor";
  const isMark = variant === "mark";
  const viewBox = isMark ? `0 0 ${LOGO.markSize.w} ${LOGO.markSize.h}` : LOGO.viewBox;
  const aspect = isMark ? LOGO.markSize.w / LOGO.markSize.h : LOGO.aspect;
  const style = { height, width: typeof height === "number" ? height * aspect : `calc(${height} * ${aspect})` };

  return (
    <svg role="img" aria-label="Ak&Ven" viewBox={viewBox} style={style} className={className} fill="none">
      {metallic && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ebd596" />
            <stop offset="0.5" stopColor="#c9a24b" />
            <stop offset="1" stopColor="#9c7a2d" />
          </linearGradient>
        </defs>
      )}
      <g fill={fill} fillRule="evenodd">
        {!isMark && <path d={LOGO.letters} />}
        <path d={LOGO.mark} transform={isMark ? undefined : LOGO.markTransform} />
      </g>
    </svg>
  );
}
