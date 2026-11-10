import { Link } from "react-router-dom";
import { useNoIndex } from "../hooks/usePageMeta";
import { useT } from "../i18n/I18n";
import { useShopInfo } from "../shop/useShopInfo";

/** Whether the shop runs in demo mode (payments are simulated). False until the shop's info has arrived. */
export function useDemoMode(): boolean {
  return useShopInfo()?.payments === "SIMULATED";
}

/**
 * In demo mode the announcement bar says, on every page, that the shop is a demo and that orders and payments are not
 * real, and search engines are asked not to list it: a visitor must never believe an order placed here is real. It
 * takes the place of the rotating messages inside the bar, which is always there, so nothing on the page moves when
 * it appears (a separate strip above the header pushed the page down after it had painted).
 */
export function DemoNote() {
  const { t } = useT();
  useNoIndex();
  return (
    <p className="av-ann__text av-ann__text--demo" role="note">
      <span className="av-ann__run"><span className="av-demotag">{t("pay.demoTag")}</span> {t("demo.ribbon")} <Link to="/visit">{t("demo.ribbonLink")}</Link></span>
    </p>
  );
}
