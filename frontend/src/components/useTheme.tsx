import { useCallback, useEffect, useState } from "react";
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

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="av-icon-btn" onClick={onToggle} aria-label={`Switch to ${next} theme`}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
