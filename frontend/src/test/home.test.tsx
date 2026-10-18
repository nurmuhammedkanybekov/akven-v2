import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { sockBounds, sockMarkup, sockTop, type SockCut } from "../brand/sockDrawing";
import { I18nProvider } from "../i18n/I18n";
import { withMessage } from "../components/Contacts";
import { sockSizeFor } from "../shop/home/FamilyPlanner";
import { resetSavedCache, useSaved } from "../shop/useSaved";
import { upcomingHolidays } from "../shop/home/GiftCalendar";
import { HeightRuler } from "../shop/home/HeightRuler";
import { ladder, typicalPairPrice } from "../shop/home/HeroCalculator";

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

describe("the price calculator in the hero", () => {
  it("takes the middle pair price of the shelf, ignoring gaps", () => {
    expect(typicalPairPrice([7, null, 4.33, 6, undefined, 0])).toBe(6);
    expect(typicalPairPrice([4, 6, 8, 10])).toBe(7);
    expect(typicalPairPrice([])).toBeNull();
  });

  it("finds the step a number of pairs reaches and the next one, in any order", () => {
    const shuffled = [TIERS[2], TIERS[0], TIERS[1]];
    expect(ladder(10, shuffled)).toEqual({ pct: 0, next: TIERS[0] });
    expect(ladder(30, shuffled)).toEqual({ pct: 5, next: TIERS[2] });
    expect(ladder(80, shuffled)).toEqual({ pct: 8, next: null });
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

describe("the family planner", () => {
  const rows = [
    { id: "k", label: "Kids", footCm: { min: 15, max: 21 }, krMm: { min: 150, max: 210 }, local: { min: 24, max: 33 }, eu: { min: 25, max: 34 }, us: "" },
    { id: "w", label: "Women", footCm: { min: 22.5, max: 26 }, krMm: { min: 225, max: 260 }, local: { min: 35, max: 41 }, eu: { min: 36, max: 41 }, us: "" },
    { id: "m", label: "Men", footCm: { min: 26, max: 29 }, krMm: { min: 260, max: 290 }, local: { min: 41, max: 45 }, eu: { min: 41, max: 46 }, us: "" },
  ];
  it("reads the sock size from the shop's chart, and gives a shared size by role", () => {
    expect(sockSizeFor(rows, 30, "son")?.label).toBe("Kids");
    expect(sockSizeFor(rows, 41, "dad")?.label).toBe("Men");
    expect(sockSizeFor(rows, 41, "mom")?.label).toBe("Women");
    expect(sockSizeFor(rows, 50, "dad")).toBeUndefined();
  });
});

describe("ordering by message", () => {
  const base = { id: "1", label: null, position: 0, active: true };
  it("writes the message into WhatsApp, Telegram and email links, and leaves the others alone", () => {
    expect(withMessage({ ...base, kind: "WHATSAPP", value: "+996700123456", url: "https://wa.me/996700123456" }, "Hi & bye"))
      .toBe("https://wa.me/996700123456?text=Hi%20%26%20bye");
    expect(withMessage({ ...base, kind: "TELEGRAM", value: "nurmss4", url: "https://t.me/nurmss4" }, "a\nb")).toBe("https://t.me/nurmss4?text=a%0Ab");
    expect(withMessage({ ...base, kind: "EMAIL", value: "a@b.kg", url: "mailto:a@b.kg" }, "x")).toBe("mailto:a@b.kg?body=x");
    expect(withMessage({ ...base, kind: "INSTAGRAM", value: "akven.socks", url: "https://instagram.com/akven.socks" }, "x")).toBe("https://instagram.com/akven.socks");
  });
});

describe("saved socks", () => {
  it("toggle in and out, and survive a reload from storage", () => {
    localStorage.removeItem("akven-saved");
    resetSavedCache();
    function Probe() {
      const s = useSaved();
      return <button onClick={() => s.toggle({ slug: "argyle-crew", name: "Argyle Crew", image: null, price: 7.5 })}>{s.items.length}</button>;
    }
    render(<Probe />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("1");
    expect(JSON.parse(localStorage.getItem("akven-saved")!)[0].slug).toBe("argyle-crew");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("0");
  });
});
