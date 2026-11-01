import { useEffect, useState } from "react";
import type { PickupPoint } from "../api/types";
import { useT } from "../i18n/I18n";
import { openStatus } from "../lib/hours";

/**
 * Container 70-E as a visitor meets it: corrugated doors with the number stencilled on, and a wooden sign on a string
 * that reads open or closed in Bishkek time. When the stall is open the doors stand ajar with warm light inside. The
 * sign swings when the door is hovered (transform only). Decorative: the same status is given in words beside it.
 */
export function StallDoor({ point }: { point: Pick<PickupPoint, "opensAt" | "closesAt" | "openDays" | "container"> | undefined }) {
  const { t } = useT();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(id); }, []);
  const status = point ? openStatus(point, now).kind : "unknown";
  const open = status === "open";
  const sign = status === "unknown" ? "AK&VEN" : t(open ? "door.open" : "door.closed");
  return (
    <svg className={`av-door${open ? " is-open" : ""}`} viewBox="0 0 220 240" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="av-door-rib" width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="6" height="10" fill="#fff" fillOpacity=".06" /><rect x="6" width="1.5" height="10" fill="#000" fillOpacity=".18" />
        </pattern>
        <linearGradient id="av-door-light" x1="0" x2="1"><stop offset="0" stopColor="#ffd98a" stopOpacity="0" /><stop offset=".5" stopColor="#ffd98a" stopOpacity=".95" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></linearGradient>
      </defs>
      {/* the container's frame and roof */}
      <rect x="6" y="14" width="208" height="222" rx="4" fill="#24414f" />
      <rect x="6" y="14" width="208" height="12" fill="#1a3039" />
      {/* light from inside, seen through the open doors */}
      <rect className="av-door__light" x="96" y="30" width="28" height="200" fill="url(#av-door-light)" />
      {/* the two doors */}
      <g className="av-door__left"><rect x="14" y="30" width="94" height="200" fill="#2e5566" /><rect x="14" y="30" width="94" height="200" fill="url(#av-door-rib)" /></g>
      <g className="av-door__right"><rect x="112" y="30" width="94" height="200" fill="#2e5566" /><rect x="112" y="30" width="94" height="200" fill="url(#av-door-rib)" /></g>
      {/* lock bars and handles */}
      {[44, 84, 136, 176].map((x) => <g key={x}><rect x={x} y="34" width="4" height="192" rx="2" fill="#9fb3bb" /><rect x={x - 3} y="122" width="10" height="16" rx="2" fill="#c9a24b" /></g>)}
      <text x="110" y="24" className="av-door__num">{point?.container ?? "70-E"}</text>
      {/* the sign on its string, hung from a nail */}
      <g className="av-door__sign">
        <path d="M110 66 80 98M110 66 140 98" stroke="#d8c8a8" strokeWidth="1.6" fill="none" />
        <circle cx="110" cy="66" r="3" fill="#c9a24b" />
        <rect x="60" y="96" width="100" height="40" rx="6" fill={open ? "#e7c06c" : "#c99d66"} />
        <rect x="60" y="96" width="100" height="40" rx="6" fill="none" stroke="#6d4a2b" strokeOpacity=".4" />
        <text x="110" y="122" textAnchor="middle" className="av-door__word">{sign}</text>
      </g>
    </svg>
  );
}
