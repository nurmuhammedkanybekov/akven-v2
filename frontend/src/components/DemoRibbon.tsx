import { Link } from "react-router-dom";
import { useNoIndex } from "../hooks/usePageMeta";
import { useT } from "../i18n/I18n";
import { useShopInfo } from "../shop/useShopInfo";

/**
 * While the shop runs in demo mode (payments are simulated), every page says so before anything else, and search
 * engines are asked not to list it: a visitor must never believe an order placed here is real. Outside demo mode
 * this renders nothing.
 */
export function DemoRibbon() {
  const info = useShopInfo();
  const demo = info?.payments === "SIMULATED";
  return demo ? <DemoRibbonShown /> : null;
}

function DemoRibbonShown() {
  const { t } = useT();
  useNoIndex();
  return (
    <p className="av-demoribbon" role="note">
      <span className="av-demotag">{t("pay.demoTag")}</span> {t("demo.ribbon")} <Link to="/visit">{t("demo.ribbonLink")}</Link>
    </p>
  );
}
