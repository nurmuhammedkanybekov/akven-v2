import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { sockBounds, sockMarkup, sockTop, type SockCut } from "../brand/sockDrawing";
import { I18nProvider } from "../i18n/I18n";
import { BoxBuilder } from "../shop/home/BoxBuilder";
import { upcomingHolidays } from "../shop/home/GiftCalendar";
import { HeightRuler } from "../shop/home/HeightRuler";

const CUTS: SockCut[] = ["no-show", "ankle", "crew", "mid-long", "knee-high"];
const TIERS = [{ minPairs: 20, discountPct: 3 }, { minPairs: 30, discountPct: 5 }, { minPairs: 50, discountPct: 8 }];
const wrap = (ui: React.ReactNode) => render(<MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>);

describe("the drawn sock", () => {
  it("gets taller from no-show to knee-high, and always fits its frame", () => {
    const tops = CUTS.map(sockTop);
    expect([...tops].sort((a, b) => b - a)).toEqual(tops);
    for (const cut of CUTS) expect(sockBounds(cut).y).toBeLessThan(sockTop(cut));
  });

  it("escapes values and keeps ids to safe characters", () => {
    const svg = sockMarkup({ cut: "crew", main: '"><script>alert(1)</script>', accent: "#fff" }, 'a"b<c');
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&quot;&gt;&lt;script&gt;");
    expect(svg).toContain('id="c-abc"');
  });

  it("draws the extras only when asked", () => {
    const plain = sockMarkup({ cut: "crew", main: "#000", accent: "#fff" }, "p");
    const bear = sockMarkup({ cut: "crew", main: "#000", accent: "#fff", pattern: "bear", grip: true, lace: true }, "b");
    expect(bear.length).toBeGreaterThan(plain.length);
    expect(plain).not.toContain("circle");
  });
});

describe("the gift calendar", () => {
  it("counts days to each holiday from today in Bishkek, nearest first", () => {
    // 18:30 UTC on 10 October is already 11 October in Bishkek (UTC+6).
    const days = upcomingHolidays(new Date("2026-10-10T18:30:00Z"));
    expect(days[0].key).toBe("gift.newYear");
    expect(days[0].days).toBe(81);
    expect(days.map((d) => d.days)).toEqual([...days.map((d) => d.days)].sort((a, b) => a - b));
  });

  it("says zero on the day itself, and rolls past dates into next year", () => {
    const days = upcomingHolidays(new Date("2027-03-08T06:00:00Z"));
    expect(days[0]).toMatchObject({ key: "gift.mar8", days: 0 });
    expect(days.find((d) => d.key === "gift.feb23")!.days).toBeGreaterThan(300);
  });
});

describe("the collection box", () => {
  it("applies the shop's own minimum and steps as socks go in", async () => {
    wrap(<BoxBuilder minPairs={10} tiers={TIERS} />);
    await userEvent.click(screen.getByRole("button", { name: "Empty the box" }));
    expect(screen.getByText("Add 10 more pairs: orders start at 10.")).toBeInTheDocument();
    const argyle = screen.getByRole("button", { name: "Add Argyle to the box" });
    for (let i = 0; i < 20; i++) await userEvent.click(argyle);
    expect(screen.getByText("−3% on every pair")).toBeInTheDocument();
    expect(screen.getByText("Add 10 more pairs for 5% off every pair.")).toBeInTheDocument();
  });
});

describe("shop by height", () => {
  it("is a radio group that changes the fitting and the link", async () => {
    wrap(<HeightRuler />);
    expect(screen.getByRole("link", { name: "Shop crew socks" })).toHaveAttribute("href", "/shop?cut=crew");
    await userEvent.click(screen.getByRole("radio", { name: "Knee-high" }));
    expect(screen.getByRole("radio", { name: "Knee-high" })).toBeChecked();
    expect(screen.getByText(/Up to the knee/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shop knee-high socks" })).toHaveAttribute("href", "/shop?cut=knee-high");
  });
});
