import { Link } from "react-router-dom";
import { useNoIndex } from "../hooks/usePageMeta";
import { useT } from "../i18n/I18n";
import { useShopInfo } from "../shop/useShopInfo";

/** Whether the shop runs in demo mode (payments are simulated). False until the shop's info has arrived. */
export function useDemoMode(): boolean {
  return useShopInfo()?.payments === "SIMULATED";
}

/**
 * In demo mode card payments are simulated, so the announcement bar says on every page that online card payment is not
 * live yet and points to what does work (reserve, pay at the stall), and search engines are asked not to list the
 * site: nobody should believe a card payment made here is real. It takes the place of the rotating messages inside the
 * bar, which is always there, so nothing on the page moves when it appears.
 */
export function DemoNote() {
  const { t } = useT();
  useNoIndex();
  return (
    <p className="av-ann__text av-ann__text--demo" role="note">
      <span className="av-ann__run">{t("demo.ribbon")} <Link to="/visit">{t("demo.ribbonLink")}</Link></span>
    </p>
  );
}
