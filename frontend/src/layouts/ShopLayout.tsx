import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { ThemeToggle, useTheme } from "../components/useTheme";
import { useT } from "../i18n/I18n";
import { useReveal } from "../shop/useReveal";

export function ShopLayout() {
  const { isStaff, session } = useAuth();
  const cart = useCart();
  const { theme, toggle } = useTheme();
  const { t } = useT();
  useReveal();
  return (
    <>
      <a className="av-skip-link" href="#main">{t("skip")}</a>
      <Header
        cartCount={cart.count}
        accountTo={isStaff ? "/admin" : session ? "/orders" : "/login"}
        accountLabel={session ? (isStaff ? t("nav.admin") : t("nav.orders")) : t("nav.signin")}
        extra={<ThemeToggle theme={theme} onToggle={toggle} />}
      />
      <main id="main"><Outlet /></main>
      <Footer />
    </>
  );
}
