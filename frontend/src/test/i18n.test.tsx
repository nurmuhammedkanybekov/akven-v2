import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { en } from "../i18n/en";
import { I18nProvider, LanguageSwitch, useT } from "../i18n/I18n";
import { ky } from "../i18n/ky";
import { ru } from "../i18n/ru";

function Hello() {
  const { t } = useT();
  return <p>{t("hero.title2")} · {t("bag.next", { n: 4, pct: 5 })}</p>;
}

describe("languages", () => {
  beforeEach(() => localStorage.clear());

  it("translates every English text into Russian and Kyrgyz", () => {
    const keys = Object.keys(en);
    expect(keys.filter((k) => !(k in ru))).toEqual([]);
    expect(keys.filter((k) => !(k in ky))).toEqual([]);
  });

  it("keeps every {placeholder} of the English text in each translation", () => {
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const [k, v] of Object.entries(en)) {
      expect(holes(ru[k as keyof typeof en] ?? v), `ru ${k}`).toBe(holes(v));
      expect(holes(ky[k as keyof typeof en] ?? v), `ky ${k}`).toBe(holes(v));
    }
  });

  it("switches language, fills in numbers, sets the page language and remembers the choice", async () => {
    render(<I18nProvider><LanguageSwitch /><Hello /></I18nProvider>);
    expect(screen.getByText("straight from container 70-E. · Add 4 more pairs to save 5% on every pair.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Кыргызча" }));
    expect(screen.getByText(/түз эле 70-Е контейнеринен\./)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ky");
    expect(localStorage.getItem("akven-lang")).toBe("ky");
    expect(screen.getByRole("button", { name: "Кыргызча" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens in the remembered language", () => {
    localStorage.setItem("akven-lang", "ru");
    render(<I18nProvider><Hello /></I18nProvider>);
    expect(screen.getByText(/прямо из контейнера 70-Е\./)).toBeInTheDocument();
    act(() => undefined);
  });
});
