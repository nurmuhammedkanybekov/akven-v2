import { useEffect, useState } from "react";
import { Button } from "../../components/Button";
import { GiftBoxScene } from "../../components/GiftBoxScene";
import { useT } from "../../i18n/I18n";
import { SOCK_COLOURS as C } from "../../brand/SockArt";
import type { GiftBoxColour, GiftRibbon } from "../../api/types";

const INSIDE = [C.cream, C.navy, C.charcoal, C.oat].map((colorHex, i) => ({ key: `s${i}`, colorHex }));
const LOOKS: Array<[GiftBoxColour, GiftRibbon]> = [["NAVY", "GOLD"], ["KRAFT", "RED"], ["RED", "WHITE"]];

/**
 * The gift box builder, introduced: the box changes colour and ribbon every few seconds and its lid opens and closes,
 * with the way to build one. Holds still with reduced motion.
 */
export function GiftTeaser() {
  const { t } = useT();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setN((x) => x + 1), 2600);
    return () => window.clearInterval(id);
  }, []);
  const [box, ribbon] = LOOKS[Math.floor(n / 2) % LOOKS.length];
  return (
    <section className="av-block" aria-labelledby="giftt-title" data-reveal>
      <div className="av-container av-giftt">
        <div className="av-giftt__stage"><GiftBoxScene box={box} ribbon={ribbon} socks={INSIDE} open={n % 2 === 0} to={t("giftt.tag")} /></div>
        <div className="av-stack av-giftt__copy">
          <span className="av-eyebrow">{t("gb.eyebrow")}</span>
          <h2 id="giftt-title">{t("giftt.title")}</h2>
          <p className="av-lead">{t("giftt.lead")}</p>
          <div className="av-row">
            <Button to="/gift" variant="accent">{t("giftt.cta")}</Button>
            <Button to="/gifts" variant="secondary">{t("giftt.sets")}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
