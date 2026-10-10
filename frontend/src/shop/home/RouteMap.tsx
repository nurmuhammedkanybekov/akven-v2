import { Button } from "../../components/Button";
import { useT } from "../../i18n/I18n";
import { useShopInfo } from "../useShopInfo";

/** Rows of containers along the passages; passage 8 is ours. */
const ROWS = Array.from({ length: 6 }, (_, r) => r);
const COLS = Array.from({ length: 9 }, (_, c) => c);
const OURS = { row: 3, col: 6 };

/**
 * The way to the stall as a drawn route: from the city to Dordoi, into Dordoi-Junhai, down passage 8 to container
 * 70-E. The road draws itself when the panel scrolls into view. Words come from the stall entered in the admin.
 */
export function RouteMap() {
  const { t } = useT();
  const info = useShopInfo();
  const stall = info?.pickupPoints[0];
  const passage = stall?.passage ?? "8";
  const container = stall?.container ?? "70-E";

  return (
    <section className="av-block" aria-labelledby="route-title" data-reveal>
      <div className="av-container">
        <div className="av-deep av-route">
          <div className="av-stack">
            <span className="av-eyebrow av-orn">{t("visit.eyebrow")}</span>
            <h2 id="route-title">{t("route.title", { container })}</h2>
            <p>{t("route.lead")}</p>
            <ol className="av-route__steps">
              <li>{t("visit.how1")}</li>
              <li>{t("visit.how2", { passage })}</li>
              <li>{t("visit.how3", { container })}</li>
            </ol>
            <div className="av-row">
              <Button to="/visit" variant="accent">{t("story.cta")}</Button>
              <Button to="/visit#pickup" variant="secondary" className="av-btn--onnavy">{t("help.delivery")}</Button>
            </div>
          </div>

          <figure className="av-route__map" aria-hidden="true">
            <svg viewBox="0 0 520 420">
              <defs>
                <pattern id="route-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="currentColor" strokeOpacity=".08" /></pattern>
              </defs>
              <rect width="520" height="420" fill="url(#route-grid)" />
              {/* the city and the road north */}
              <circle cx="60" cy="370" r="7" className="av-route__dot" />
              <text x="76" y="375" className="av-route__label">{t("route.city")}</text>
              <path d="M60 370C120 330 90 260 170 230S260 150 300 120" className="av-route__road" />
              <path d="M60 370C120 330 90 260 170 230S260 150 300 120" className="av-route__path" pathLength={1} />
              <circle cx="170" cy="230" r="5" className="av-route__dot" />
              <text x="58" y="222" className="av-route__label">{t("route.bazaar")}</text>
              {/* the market: rows of containers, passage 8 picked out */}
              <g transform="translate(250 40)">
                <rect x="-14" y="-14" width="268" height="206" rx="10" className="av-route__market" />
                <text x="0" y="-22" className="av-route__label av-route__label--small">{t("route.junhai")}</text>
                {ROWS.map((r) => COLS.map((c) => (
                  <rect key={`${r}-${c}`} x={c * 27} y={r * 30} width="22" height="20" rx="2"
                    className={r === OURS.row && c === OURS.col ? "av-route__ours" : "av-route__box"} />
                )))}
                <path d={`M-10 ${OURS.row * 30 - 5}H250`} className="av-route__passage" />
                <text x="-6" y={OURS.row * 30 - 10} className="av-route__label av-route__label--small">{t("visit.passage")} {passage}</text>
                <path d={`M50 80V${OURS.row * 30 - 5}H${OURS.col * 27 + 11}V${OURS.row * 30}`} className="av-route__path av-route__path--late" pathLength={1} />
                <circle cx={OURS.col * 27 + 11} cy={OURS.row * 30 + 10} r="16" className="av-route__pulse" />
                <text x={OURS.col * 27 - 6} y={OURS.row * 30 + 46} className="av-route__label av-route__label--gold">{container}</text>
              </g>
            </svg>
          </figure>
        </div>
      </div>
    </section>
  );
}
