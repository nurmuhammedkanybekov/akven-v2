import type { SockCut } from "../../brand/SockArt";
import { sockOutline, sockTop } from "../../brand/sockDrawing";

const CUT_SET = new Set<string>(["no-show", "ankle", "crew", "mid-long", "knee-high"]);
export const isCut = (s: string): s is SockCut => CUT_SET.has(s);

/** A tiny leg with the sock pulled up to the cut's height: the height filter, read at a glance. */
export function HeightIcon({ cut }: { cut: SockCut }) {
  const top = sockTop("knee-high") - 40;
  return (
    <svg className="av-heighticon" viewBox={`-8 ${top} 244 ${310 - top}`} aria-hidden="true" focusable="false">
      <path d={`M2 ${top}H98V${sockTop("knee-high")}Z${sockOutline("knee-high")}`} className="av-heighticon__leg" />
      <path d={sockOutline(cut)} className="av-heighticon__sock" />
    </svg>
  );
}
