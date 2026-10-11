import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ThemeToggle, useTheme } from "../components/useTheme";
import { LanguageSwitch, useT } from "../i18n/I18n";

/**
 * Everything under /admin, in English, Russian or Kyrgyz. The menu is grouped by who uses it: the shop (everyone on
 * the team), the owners, and the system (the super admin). Signed-out visitors go to the login page, signed-in
 * customers are told they have no access.
 */
export function AdminLayout() {
  const { session, isStaff, isAdmin, isSuperAdmin, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { t } = useT();
  const location = useLocation();
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isStaff) {
    return (
      <div className="av-container av-page av-empty">
        <h1>{t("a.noAccess.title")}</h1>
        <p className="av-lead">{t("a.noAccess.lead", { email: session.email })}</p>
        <div className="av-row"><Button to="/">{t("a.noAccess.back")}</Button><Button variant="secondary" onClick={signOut}>{t("a.signOut")}</Button></div>
      </div>
    );
  }
  const role = isSuperAdmin ? t("a.role.SUPER_ADMIN") : isAdmin ? t("a.role.ADMIN") : t("a.role.STAFF");
  return (
    <div className="av-admin">
      <a className="av-skip-link" href="#admin-main">{t("skip")}</a>
      <aside className="av-admin__side">
        <Link to="/admin" aria-label={t("a.home")}><Logo height={22} /></Link>
        <nav className="av-admin__nav" aria-label={t("a.menu")}>
          <span className="av-admin__group">{t("a.group.shop")}</span>
          <NavLink to="/admin" end>{t("a.nav.products")}</NavLink>
          <NavLink to="/admin/orders">{t("a.nav.orders")}</NavLink>
          <NavLink to="/admin/handover">{t("a.nav.handover")}</NavLink>
          <NavLink to="/admin/sections">{t("a.nav.sections")}</NavLink>
          <NavLink to="/admin/negotiations">{t("a.nav.negotiations")}</NavLink>
          <NavLink to="/admin/dashboard">{t("a.nav.dashboard")}</NavLink>
          {isAdmin && <span className="av-admin__group">{t("a.group.owners")}</span>}
          {isAdmin && <NavLink to="/admin/pricing">{t("a.nav.pricing")}</NavLink>}
          {isAdmin && <NavLink to="/admin/customers">{t("a.nav.customers")}</NavLink>}
          {isAdmin && <NavLink to="/admin/shop">{t("a.nav.shop")}</NavLink>}
          {isAdmin && <NavLink to="/admin/sizes">{t("a.nav.sizes")}</NavLink>}
          {isSuperAdmin && <span className="av-admin__group">{t("a.group.system")}</span>}
          {isSuperAdmin && <NavLink to="/admin/accounts">{t("a.nav.accounts")}</NavLink>}
          {isSuperAdmin && <NavLink to="/admin/assistant">{t("a.nav.assistant")}</NavLink>}
          {isSuperAdmin && <NavLink to="/admin/audit">{t("a.nav.audit")}</NavLink>}
          <Link to="/" target="_blank" rel="noreferrer">{t("a.nav.viewShop")}</Link>
        </nav>
        <div className="av-admin__who">
          <span className="av-small" title={session.email}>{session.email}</span>
          <Badge tone={isAdmin ? "accent" : "neutral"}>{role}</Badge>
          <LanguageSwitch />
          <div className="av-row">
            <ThemeToggle theme={theme} onToggle={toggle} />
            <Button variant="ghost" size="sm" onClick={signOut}>{t("a.signOut")}</Button>
          </div>
        </div>
      </aside>
      <main id="admin-main" className="av-admin__main"><Outlet /></main>
    </div>
  );
}
