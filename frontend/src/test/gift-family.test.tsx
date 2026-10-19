import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { sockMarkup } from "../brand/sockDrawing";
import { GiftSummary } from "../components/GiftSummary";
import { sharedSlugs } from "../pages/Saved";
import { categoryFor, daysToBirthday } from "../shop/family";
import { giftForCheckout, parseGift, resetGiftCache, setGift } from "../shop/useGift";
import { resetSavedCache, useSaved } from "../shop/useSaved";
import { renderHook, act } from "@testing-library/react";

beforeEach(() => { localStorage.clear(); resetGiftCache(); resetSavedCache(); });

describe("the gift box kept with the bag", () => {
  it("keeps only known boxes and ribbons, and drops words that are too long", () => {
    expect(parseGift({ box: "NAVY", ribbon: "GOLD", to: "Aigerim", from: null, message: "Hi", hidePrices: true }))
      .toEqual({ box: "NAVY", ribbon: "GOLD", to: "Aigerim", from: null, message: "Hi", hidePrices: true });
    expect(parseGift({ box: "PINK", ribbon: "GOLD" })).toBeNull();
    expect(parseGift({ box: "RED", ribbon: "RED", message: "x".repeat(301) })?.message).toBeNull();
    expect(parseGift("<script>")).toBeNull();
  });

  it("sends trimmed words and leaves empty ones out", () => {
    expect(giftForCheckout({ box: "RED", ribbon: "WHITE", to: "  Ana ", from: "   ", message: "", hidePrices: false }))
      .toEqual({ box: "RED", ribbon: "WHITE", to: "Ana", from: null, message: null, hidePrices: false });
    expect(giftForCheckout(null)).toBeNull();
  });

  it("is stored in this browser and can be removed", () => {
    setGift({ box: "KRAFT", ribbon: "RED", to: null, from: null, message: null, hidePrices: false });
    expect(JSON.parse(localStorage.getItem("akven-gift-v1")!).box).toBe("KRAFT");
    setGift(null);
    expect(localStorage.getItem("akven-gift-v1")).toBeNull();
  });

  it("shows the card's words as text, never as markup", () => {
    render(<MemoryRouter><GiftSummary gift={{ box: "NAVY", ribbon: "GOLD", to: "Venera", from: "Nur", message: "<img src=x onerror=alert(1)>", hidePrices: true }} /></MemoryRouter>);
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("for Venera · from Nur")).toBeInTheDocument();
  });
});

describe("the family", () => {
  it("puts each person on the right shelf", () => {
    expect(categoryFor({ role: "son", shoeSize: 30 })).toBe("KIDS");
    expect(categoryFor({ role: "son", shoeSize: 42 })).toBe("MEN");
    expect(categoryFor({ role: "mom", shoeSize: 38 })).toBe("WOMEN");
    expect(categoryFor({ role: "grandpa", shoeSize: 43 })).toBe("MEN");
  });

  it("counts the days to a birthday on Bishkek's calendar", () => {
    const now = new Date("2026-03-01T06:00:00Z");                      // 12:00 in Bishkek
    expect(daysToBirthday("1975-03-08", now)).toBe(7);
    expect(daysToBirthday("1990-03-01", now)).toBe(0);
    expect(daysToBirthday("1990-02-28", now)).toBe(364);
    expect(daysToBirthday(null, now)).toBeNull();
    expect(daysToBirthday("not a date", now)).toBeNull();
  });
});

describe("a shared list of saved socks", () => {
  it("reads only clean slugs from the link, each once, at most 24", () => {
    expect(sharedSlugs("argyle-crew,argyle-crew,../admin,<b>,Classic-Ankle")).toEqual(["argyle-crew", "classic-ankle"]);
    expect(sharedSlugs(Array.from({ length: 40 }, (_, i) => `s${i}`).join(","))).toHaveLength(24);
    expect(sharedSlugs(null)).toEqual([]);
  });

  it("saves several socks in a row without losing any", () => {
    const { result } = renderHook(() => useSaved());
    act(() => {
      result.current.toggle({ slug: "a", name: "A", image: null, price: 1 });
      result.current.toggle({ slug: "b", name: "B", image: null, price: 1 });
      result.current.addAll([{ slug: "b", name: "B", image: null, price: 1 }, { slug: "c", name: "C", image: null, price: 1 }]);
    });
    expect(result.current.items.map((i) => i.slug).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("the sock drawing", () => {
  it("writes only colours into its markup, whatever it is given", () => {
    const svg = sockMarkup({ cut: "crew", main: '"/><script>alert(1)</script>', accent: "red", second: "#abc" }, "x");
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("red\"");
    expect(svg).toContain("#1f2a44");
  });
});

describe("the account page", () => {
  it("shows the saved family with sock sizes and saves a change", async () => {
    const { vi } = await import("vitest");
    const userEvent = (await import("@testing-library/user-event")).default;
    const { AuthProvider } = await import("../auth/AuthContext");
    const { ToastProvider } = await import("../components/Toast");
    const { AccountPage } = await import("../pages/Account");
    const { resetFamilyCache } = await import("../shop/family");
    resetFamilyCache();
    sessionStorage.setItem("akven-session", JSON.stringify({ token: "t", email: "aida@akven.test", role: "CUSTOMER" }));
    const family = [{ id: "1", name: "Akylbek", role: "dad", shoeSize: 43, pairs: 5, birthday: null }];
    const sent: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      if (u === "/api/family" && init?.method === "PUT") { const body = JSON.parse(String(init.body)); sent.push(body); return new Response(JSON.stringify(body.members.map((m: object, i: number) => ({ ...m, id: String(i) })))); }
      if (u === "/api/family") return new Response(JSON.stringify(family));
      if (u.startsWith("/api/sizes")) return new Response(JSON.stringify({ lang: "en", columns: [], rows: [{ id: "m", label: "Men", footCm: { min: 26, max: 29 }, krMm: { min: 260, max: 290 }, local: { min: 41, max: 45 }, eu: { min: 41, max: 46 }, us: "" }] }));
      return new Response("[]");
    });
    render(<MemoryRouter><AuthProvider><ToastProvider><AccountPage /></ToastProvider></AuthProvider></MemoryRouter>);
    const name = await screen.findByDisplayValue("Akylbek");
    expect(await screen.findByText("Sock size: Men 41–45")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.clear(name);
    await user.type(name, "Aké");
    await user.click(screen.getByRole("button", { name: "Save my family" }));
    await screen.findByText("Your family is saved.");
    expect(sent[0]).toEqual({ members: [{ name: "Aké", role: "dad", shoeSize: 43, pairs: 5, birthday: null }] });
    vi.restoreAllMocks();
  });
});
