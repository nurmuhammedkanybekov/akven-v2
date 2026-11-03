import { useSearchParams } from "react-router-dom";
import type { SockCut } from "../brand/SockArt";
import { useT } from "../i18n/I18n";
import { CUTS, FittingRoom, WHO, type Who } from "../shop/fitting/FittingRoom";

/**
 * The fitting room on a page of its own: every sock of a height on the leg, the shoes, the size from the shop's chart
 * and the trousers. Opens where the home page's teaser was left (?who=WOMEN&cut=ankle).
 */
export function FittingPage() {
  const { t } = useT();
  const [params] = useSearchParams();
  const who = WHO.find((w) => w === params.get("who")) as Who | undefined;
  const cut = CUTS.find((c) => c === params.get("cut")) as SockCut | undefined;
  return (
    <section className="av-block av-fitroom av-fitroom--page" id="fitting" aria-labelledby="fitting-title">
      <div className="av-container">
        <header className="av-fitroom__head">
          <div>
            <span className="av-hand">{t("fr.eyebrow")}</span>
            <h1 id="fitting-title">{t("fr.title")}</h1>
          </div>
          <p className="av-lead">{t("fr.lead")}</p>
        </header>
        <FittingRoom start={{ who, cut }} />
      </div>
    </section>
  );
}
