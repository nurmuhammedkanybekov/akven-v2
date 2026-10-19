import { Link } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18n";

/** Nothing at this address: a page, a product that left the shelf, or an order that is not this customer's. */
export function NotFoundPage({ kind = "page" }: { kind?: "page" | "product" | "order" }) {
  const { t } = useT();
  return (
    <div className="av-container av-page av-empty">
      <Logo variant="mark" height={72} />
      <h1>{t(kind === "product" ? "nf.product" : kind === "order" ? "nf.order" : "nf.page")}</h1>
      <p className="av-lead">{t("nf.lead")} <Link to="/shop">{t("nf.browse")}</Link></p>
      <Button to="/">{t("nf.back")}</Button>
    </div>
  );
}
