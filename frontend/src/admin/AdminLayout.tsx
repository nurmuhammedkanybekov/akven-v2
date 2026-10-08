import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Logo } from "../brand/Logo";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ThemeToggle, useTheme } from "../components/useTheme";

/** Everything under /admin: signed-out visitors go to the login page, signed-in customers are told they have no access. */
export function AdminLayout() {
  const { session, isStaff, isAdmin, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isStaff) {
    return (
      <div className="av-container av-page av-empty">
        <h1>This area is for the shop team</h1>
        <p className="av-lead">You are signed in as {session.email}, which does not have access to the admin.</p>
        <div className="av-row"><Button to="/">Back to the shop</Button><Button variant="secondary" onClick={signOut}>Sign out</Button></div>
      </div>
    );
  }
  return (
    <div className="av-admin">
      <a className="av-skip-link" href="#admin-main">Skip to content</a>
      <aside className="av-admin__side">
        <Link to="/admin" aria-label="Ak&Ven admin"><Logo height={22} /></Link>
        <nav className="av-admin__nav" aria-label="Admin">
          <NavLink to="/admin" end>Products</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/negotiations">Negotiations</NavLink>
          <NavLink to="/admin/sections">Sections and cuts</NavLink>
          <NavLink to="/admin/dashboard">Dashboard</NavLink>
          <NavLink to="/admin/handover">Hand over an order</NavLink>
          {isAdmin && <NavLink to="/admin/pricing">Pricing</NavLink>}
          {isAdmin && <NavLink to="/admin/shop">Contacts and the stall</NavLink>}
          {isAdmin && <NavLink to="/admin/sizes">Size chart</NavLink>}
          <Link to="/" target="_blank" rel="noreferrer">View the shop</Link>
        </nav>
        <div className="av-admin__who">
          <span className="av-small" title={session.email}>{session.email}</span>
          <Badge tone={isAdmin ? "accent" : "neutral"}>{isAdmin ? "Admin" : "Staff"}</Badge>
          <div className="av-row">
            <ThemeToggle theme={theme} onToggle={toggle} />
            <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </aside>
      <main id="admin-main" className="av-admin__main"><Outlet /></main>
    </div>
  );
}
