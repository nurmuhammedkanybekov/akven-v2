import { useId } from "react";
import { useT } from "../i18n/I18n";
import { LOGO } from "./logo.generated";

const A = LOGO.parts.amp;

/**
 * A round stamp: the shop's name, place and year around the edge, the heart of the logo in the middle. The ring of
 * words turns slowly, like the stamp on a paper bag from the stall (not for people who ask for less motion). The ring
 * is its own element, turned about its own centre as a box, so it cannot drift in any browser; the heart stays still.
 */
export function Seal({ className }: { className?: string }) {
  const { t } = useT();
  const id = `seal${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const s = 46 / Math.max(A.w, LOGO.parts.cap);
  return (
    <span className={`av-seal${className ? ` ${className}` : ""}`} aria-hidden="true">
      <svg className="av-seal__base" viewBox="0 0 200 200" focusable="false">
        <circle cx="100" cy="100" r="96" className="av-seal__ring" />
        <circle cx="100" cy="100" r="54" className="av-seal__inner" />
        <path transform={`translate(${100 - (A.x + A.w / 2) * s} ${100 + (LOGO.parts.cap / 2) * s}) scale(${s})`} d={A.d} className="av-seal__heart" />
      </svg>
      <svg className="av-seal__turn" viewBox="0 0 200 200" focusable="false">
        <defs><path id={id} d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0" /></defs>
        <text className="av-seal__text"><textPath href={`#${id}`} textLength="462" lengthAdjust="spacing">{t("seal.text")}</textPath></text>
      </svg>
    </span>
  );
}
