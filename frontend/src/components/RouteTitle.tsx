import { useLocation } from "react-router-dom";
import { usePageDescription } from "../hooks/usePageMeta";
import { usePageTitle } from "../hooks/usePageTitle";
import { useT } from "../i18n/I18n";
import { en, type MessageKey } from "../i18n/en";

const SHOP: Record<string, MessageKey> = {
  "/shop": "title.shop", "/men": "nav.men", "/women": "nav.women", "/kids": "nav.kids", "/bundles": "nav.bundles",
  "/visit": "nav.visit", "/privacy": "foot.privacy", "/sizes": "title.sizes", "/wholesale": "nav.wholesale", "/login": "nav.signin",
  "/register": "title.register", "/cart": "title.bag", "/saved": "nav.savedTitle", "/checkout": "title.checkout",
  "/orders": "nav.orders", "/fitting": "nav.fitting", "/family": "nav.family",
};

/** What search engines show under each main page's title (a product page writes its own from the product). */
const DESCRIPTION: Record<string, MessageKey> = {
  "/shop": "desc.shop", "/men": "desc.men", "/women": "desc.women", "/kids": "desc.kids", "/bundles": "desc.gifts", "/gifts": "desc.gifts",
  "/story": "desc.story", "/visit": "desc.visit", "/wholesale": "desc.wholesale", "/sizes": "desc.sizes", "/fitting": "desc.sizes", "/family": "desc.family",
};

/** Names the tab after the page, and describes the main pages. A product page names it after the product itself (ProductPage). */
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
  usePageDescription(DESCRIPTION[path] ? t(DESCRIPTION[path]) : null);
  return null;
}
