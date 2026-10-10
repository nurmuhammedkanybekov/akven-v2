import { useState } from "react";
import { SOCK_COLOURS as C, SockArt, type SockCut } from "../../brand/SockArt";
import { sockBounds, sockOutline, sockTop } from "../../brand/sockDrawing";
import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const CUTS: SockCut[] = ["no-show", "ankle", "crew", "mid-long", "knee-high"];
const FRAME = sockBounds("knee-high");
/** The leg reaches a little above the tallest sock. */
const LEG_TOP = FRAME.y;

/**
 * "Shop by height" as a fitting: a leg with a ruler, and the chosen sock pulled up onto it. Every cut is drawn in the
 * same frame, so the sock's top lands exactly where the ruler says. The choice is a real radio group.
 */
export function HeightRuler() {
  const { t } = useT();
  const [cut, setCut] = useState<SockCut>("crew");
  const pct = (y: number) => `${(((y - FRAME.y) / FRAME.h) * 100).toFixed(2)}%`;

  return (
    <section className="av-block" aria-labelledby="height-title" data-reveal>
      <div className="av-container av-fit">
        <div className="av-stack av-fit__copy">
          <span className="av-eyebrow av-orn">{t("height.eyebrow")}</span>
          <h2 id="height-title">{t("height.title")}</h2>
          <p className="av-lead">{t("height.lead")}</p>
          <div className="av-fit__choices" role="radiogroup" aria-label={t("height.title")}>
            {CUTS.map((c) => (
              <label key={c} className={`av-fit__choice${c === cut ? " is-on" : ""}`}>
                <input type="radio" name="fit-cut" value={c} checked={c === cut} onChange={() => setCut(c)} />
                <span>{t(`cut.${c}` as MessageKey)}</span>
              </label>
            ))}
          </div>
          <p className="av-fit__note" aria-live="polite">{t(`fit.${c2k(cut)}` as MessageKey)}</p>
          <div className="av-row"><Button to={`/shop?cut=${cut}`}>{t("height.shop", { cut: t(`cut.${cut}` as MessageKey).toLowerCase() })}</Button></div>
        </div>

        <figure className="av-fit__figure" aria-hidden="true">
          <div className="av-fit__leg">
            <svg viewBox={`${FRAME.x} ${FRAME.y} ${FRAME.w} ${FRAME.h}`} className="av-fit__body">
              <rect x="0" y={LEG_TOP} width="100" height={sockTop("knee-high") - LEG_TOP + 2} fill="currentColor" />
              <path d={sockOutline("knee-high")} fill="currentColor" />
            </svg>
            <SockArt key={cut} frame="knee-high" className="av-fit__sock" cut={cut} main={C.navy} accent={C.gold} pattern="oimo" second={C.cream} />
            <div className="av-fit__ruler">
            {CUTS.map((c) => (
              <span key={c} className={c === cut ? "is-on" : undefined} style={{ top: pct(c === "no-show" ? sockTop(c) - 6 : sockTop(c)) }}>
                {t(`cut.${c}` as MessageKey)}
              </span>
            ))}
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

function c2k(cut: SockCut): string {
  return cut === "no-show" ? "noShow" : cut === "mid-long" ? "midLong" : cut === "knee-high" ? "kneeHigh" : cut;
}
