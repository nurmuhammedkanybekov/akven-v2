import { Link } from "react-router-dom";
import { PinIcon, SparkIcon, StackIcon, TruckIcon, HeartIcon } from "../../components/icons";
import { OpenNow } from "../../components/OpenNow";
import { useT } from "../../i18n/I18n";
import { useShopInfo } from "../useShopInfo";

/**
 * Five plain facts under the first screen, for someone ordering from a family stall for the first time: what the socks
 * are, who runs it and since when, where the stall is (and whether it is open now), where orders go, and the way in for
 * shops. Quiet, one line each, no claims beyond what the shop does.
 */
export function TrustStrip() {
  const { t } = useT();
  const stall = useShopInfo()?.pickupPoints[0];
  return (
    <section className="av-trust" aria-label={t("trust.label")}>
      <ul className="av-container av-trust__list">
        <li><SparkIcon /><span><strong>{t("trust.korean")}</strong>{t("trust.koreanS")}</span></li>
        <li><HeartIcon /><span><strong>{t("trust.family")}</strong>{t("trust.familyS")}</span></li>
        <li><PinIcon /><span><strong>{t("trust.stall")}</strong>{stall ? <OpenNow point={stall} className="av-trust__open" /> : t("trust.stallS")}</span></li>
        <li><TruckIcon /><span><strong>{t("trust.delivery")}</strong>{t("trust.deliveryS")}</span></li>
        <li><StackIcon /><span><strong>{t("trust.wholesale")}</strong><Link to="/wholesale">{t("trust.wholesaleS")}</Link></span></li>
      </ul>
    </section>
  );
}
