import { Link } from "react-router-dom";
import { SOCK_COLOURS as C } from "../brand/SockArt";
import { Button } from "../components/Button";
import { Clothesline, Peg } from "../components/Clothesline";
import { useT } from "../i18n/I18n";
import { useNoIndex } from "../hooks/usePageMeta";

/**
 * Nothing at this address: a page, a product that left the shelf, or an order that is not this customer's. Drawn as
 * the washing line with one sock on it and an empty peg beside it: this one lost its pair.
 */
export function NotFoundPage({ kind = "page" }: { kind?: "page" | "product" | "order" }) {
  const { t } = useT();
  useNoIndex();
  return (
    <div className="av-container av-page av-lost">
      <div className="av-lost__line" aria-hidden="true">
        <Clothesline at={[0.34]} width={0.3} sag={0.04} socks={[{ cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream }]} />
        <Peg className="av-lost__peg" />
      </div>
      <p className="av-hand av-lost__hand">{t("nf.hand")}</p>
      <h1>{t(kind === "product" ? "nf.product" : kind === "order" ? "nf.order" : "nf.page")}</h1>
      <p className="av-lead">{t("nf.lead")} <Link to="/shop">{t("nf.browse")}</Link></p>
      <Button to="/">{t("nf.back")}</Button>
    </div>
  );
}
