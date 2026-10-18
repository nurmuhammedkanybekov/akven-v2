import { useLocation } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useT } from "../i18n/I18n";
import { en, type MessageKey } from "../i18n/en";

const SHOP: Record<string, MessageKey> = {
  "/shop": "title.shop", "/men": "nav.men", "/women": "nav.women", "/kids": "nav.kids", "/bundles": "nav.bundles",
  "/visit": "nav.visit", "/sizes": "title.sizes", "/wholesale": "nav.wholesale", "/login": "nav.signin",
  "/register": "title.register", "/cart": "title.bag", "/saved": "nav.savedTitle", "/checkout": "title.checkout",
  "/orders": "nav.orders",
};

/** Names the tab after the page. A product page names it after the product itself (ProductPage). */
export function RouteTitle() {
  const { t } = useT();
  const path = useLocation().pathname.replace(/\/+$/, "") || "/";
  let key: MessageKey | null = null;
  if (path.startsWith("/admin")) {
    const section = path.split("/")[2];
    const candidate = `a.nav.${section || "products"}`;
    key = candidate in en ? (candidate as MessageKey) : "nav.admin";
  } else if (path.startsWith("/orders/")) key = "nav.orders";
  else if (path !== "/" && !path.startsWith("/products/")) key = SHOP[path] ?? "title.notFound";
  usePageTitle(path.startsWith("/products/") ? undefined : key ? t(key) : null);
  return null;
}
