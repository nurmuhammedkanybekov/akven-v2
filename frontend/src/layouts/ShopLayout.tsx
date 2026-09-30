import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { ThemeToggle, useTheme } from "../components/useTheme";

export function ShopLayout() {
  const { isStaff, session } = useAuth();
  const { theme, toggle } = useTheme();
  return (
    <>
      <a className="av-skip-link" href="#main">Skip to content</a>
      <Header
        accountTo={isStaff ? "/admin" : "/login"}
        accountLabel={session ? (isStaff ? "Open the admin" : "Your account") : "Sign in"}
        extra={<ThemeToggle theme={theme} onToggle={toggle} />}
      />
      <main id="main"><Outlet /></main>
      <Footer />
    </>
  );
}
