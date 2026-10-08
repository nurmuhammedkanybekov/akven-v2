import { Button } from "../components/Button";
import { StackIcon, StoreIcon, TruckIcon } from "../components/icons";
import { useT } from "../i18n/I18n";
import { useShopInfo } from "../shop/useShopInfo";

/**
 * Wholesale prices depend on the dollar rate, transport and the factory price, so they are never published: this
 * page explains how wholesale works and hands the customer to the owners' own channels.
 */
export function WholesalePage() {
  const { t } = useT();
  const info = useShopInfo();
  const channels = info?.contacts.filter((c) => c.kind !== "INSTAGRAM") ?? [];
  return (
    <div className="av-container av-page av-stack">
      <header className="av-page__head">
        <span className="av-eyebrow">{t("whole.eyebrow")}</span>
        <h1>{t("whole.title")}</h1>
        <p className="av-lead">{t("whole.pageLead")}</p>
      </header>
      <ul className="av-help av-help--static">
        <li><div><StackIcon /><strong>{t("whole.packs")}</strong><span>{t("whole.packsS")}</span></div></li>
        <li><div><StoreIcon /><strong>{t("whole.cases")}</strong><span>{t("whole.casesS")}</span></div></li>
        <li><div><TruckIcon /><strong>{t("whole.price")}</strong><span>{t("whole.priceS")}</span></div></li>
      </ul>
      <div className="av-deep av-whole__panel">
        <h2>{t("whole.write")}</h2>
        <div className="av-row">
          {channels.map((c) => (
            <Button key={c.id} href={c.url} variant="accent" target={c.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
              {c.label ?? c.kind}
            </Button>
          ))}
          {channels.length === 0 && <p>{t("visit.noContacts")}</p>}
        </div>
      </div>
    </div>
  );
}
