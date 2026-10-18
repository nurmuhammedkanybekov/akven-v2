import { useCallback, useEffect, useState } from "react";
import { useT } from "../i18n/I18n";
import { MoonIcon, SunIcon } from "./icons";

export type Theme = "light" | "dark";
const KEY = "akven-theme";

function systemTheme(): Theme {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function saved(): Theme | null {
  try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : null; } catch { return null; }
}

/** Light or dark: the visitor's saved choice, else the system setting. Storage failures never break the page. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => saved() ?? systemTheme());
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode: the choice just will not persist */ }
  }, []);
  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

export function ThemeToggle({ theme, onToggle, className = "av-icon-btn" }: { theme: Theme; onToggle: () => void; className?: string }) {
  const { t } = useT();
  return (
    <button type="button" className={className} onClick={onToggle} aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
