import { useId } from "react";
import { useT } from "../i18n/I18n";
import { LOGO } from "./logo.generated";

const A = LOGO.parts.amp;

/**
 * A round stamp: the shop's name, place and year around the edge, the heart of the logo in the middle. It turns
 * slowly, like the stamp on a paper bag from the stall (not for people who ask for less motion).
 */
export function Seal({ className }: { className?: string }) {
  const { t } = useT();
  const id = `seal${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const text = t("seal.text");
  const s = 46 / Math.max(A.w, LOGO.parts.cap);
  return (
    <svg className={`av-seal${className ? ` ${className}` : ""}`} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs><path id={id} d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0" /></defs>
      <circle cx="100" cy="100" r="96" className="av-seal__ring" />
      <circle cx="100" cy="100" r="54" className="av-seal__inner" />
      <g className="av-seal__turn">
        <text className="av-seal__text"><textPath href={`#${id}`} textLength="462" lengthAdjust="spacing">{text}</textPath></text>
      </g>
      <path transform={`translate(${100 - (A.x + A.w / 2) * s} ${100 + (LOGO.parts.cap / 2) * s}) scale(${s})`} d={A.d} className="av-seal__heart" />
    </svg>
  );
}
