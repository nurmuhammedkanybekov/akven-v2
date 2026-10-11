import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Price } from "../components/Price";
import { I18nProvider } from "../i18n/I18n";
import { openStatus, weekdayNames } from "../lib/hours";
import { CurrencySwitch, toSom } from "../shop/useMoney";

vi.mock("../api/endpoints", () => ({ getPricing: () => Promise.resolve({ minOrderPairs: 1, tiers: [], somPerUsd: 87.5, somRounding: 10 }) }));

const STALL = { opensAt: "08:00:00", closesAt: "16:00:00", openDays: 127 };
/** A moment given in Bishkek time (UTC+6). */
const bishkek = (iso: string) => new Date(new Date(iso + "Z").getTime() - 6 * 3_600_000);

describe("opening hours, in Bishkek time", () => {
  it("is open between 8:00 and 16:00, and says until when", () => {
    expect(openStatus(STALL, bishkek("2026-10-12T10:30:00"))).toEqual({ kind: "open", closes: "16:00" });
    expect(openStatus(STALL, bishkek("2026-10-12T08:00:00")).kind).toBe("open");
    expect(openStatus(STALL, bishkek("2026-10-12T16:00:00")).kind).toBe("closed");
  });

  it("says it opens today in the early morning, and tomorrow in the evening", () => {
    expect(openStatus(STALL, bishkek("2026-10-12T06:00:00"))).toMatchObject({ kind: "closed", opens: "8:00", inDays: 0 });
    expect(openStatus(STALL, bishkek("2026-10-12T19:00:00"))).toMatchObject({ kind: "closed", inDays: 1 });
  });

  it("skips the days the stall is closed", () => {
    const weekdays = { ...STALL, openDays: 0b0011111 }; // Monday to Friday
    // Saturday 10 October 2026, 10:00: next open is Monday, two days later
    expect(openStatus(weekdays, bishkek("2026-10-10T10:00:00"))).toMatchObject({ kind: "closed", inDays: 2, day: 0 });
  });

  it("stays quiet until the owners enter the hours", () => {
    expect(openStatus({ opensAt: null, closesAt: null, openDays: 127 })).toEqual({ kind: "unknown" });
  });

  it("names the days in the visitor's language, Monday first", () => {
    expect(weekdayNames("en")[0]).toBe("Monday");
    expect(weekdayNames("ru")[6]).toMatch(/^Воскресенье$/i);
  });
});

describe("prices in som", () => {
  beforeEach(() => { localStorage.clear(); });

  it("rounds the owners' way", () => {
    expect(toSom(7.5, 87.5, 10)).toBe(660);
    expect(toSom(7.5, 87.5, 1)).toBe(656);
    expect(toSom(7.5, 87.5, 100)).toBe(700);
  });

  it("shows dollars in English until the visitor picks som, then remembers it", async () => {
    render(<I18nProvider><CurrencySwitch /><Price amount={7.5} /></I18nProvider>);
    expect(await screen.findByText("$7.50")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Kyrgyz som" }));
    expect(await screen.findByText("660 som")).toBeInTheDocument();
    expect(localStorage.getItem("akven-currency")).toBe("KGS");
  });

  it("reads som by default in Russian and Kyrgyz", async () => {
    localStorage.setItem("akven-lang", "ky");
    render(<I18nProvider><Price amount={12} /></I18nProvider>);
    expect(await screen.findByText(/^1\s050 сом$/u)).toBeInTheDocument();
  });
});
