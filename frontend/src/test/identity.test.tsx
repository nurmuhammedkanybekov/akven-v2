import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "../api/types";
import { Logo } from "../brand/Logo";
import { Seal } from "../brand/Seal";
import { I18nProvider } from "../i18n/I18n";
import { CUTS, FIT, FittingRoom, SHOE_LIST } from "../shop/fitting/FittingRoom";
import { HeightIcon, isCut } from "../shop/fitting/HeightIcon";
import { specFor, type SockSpecs } from "../shop/fitting/specs";
import { StallNotes } from "../shop/home/StallNotes";
import { useVariantChoice } from "../shop/useVariantChoice";

const wrap = (ui: React.ReactNode) => render(<MemoryRouter><I18nProvider>{ui}</I18nProvider></MemoryRouter>);
const card = (slug: string, name: string, colors: string[]) => ({ slug, name, category: "MEN", section: null, cut: { slug: "crew", name: "Crew" }, collection: null,
  minPrice: 5, minPairPrice: 5, variantCount: 2, inStock: true, colors, image: null, hoverImage: null });
const SPECS: SockSpecs = {
  "rib-crew": { s: { cut: "crew", main: "#4a4d52", accent: "#8a8d91", pattern: "rib" }, c: { "#23211D": ["#23211D", "#8a8d91"], "#1F2A44": ["#1F2A44", "#c9a24b"] } },
  "argyle-crew": { s: { cut: "crew", main: "#1f2a44", accent: "#c9a24b", pattern: "argyle" }, c: {} },
};
const CHART = { lang: "en", columns: [], rows: [
  { id: "w", label: "Women", footCm: { min: 22.5, max: 26 }, krMm: { min: 225, max: 260 }, local: { min: 35, max: 41 }, eu: { min: 36, max: 41 }, us: "" },
  { id: "m", label: "Men", footCm: { min: 26, max: 29 }, krMm: { min: 260, max: 290 }, local: { min: 41, max: 45 }, eu: { min: 41, max: 46 }, us: "" },
] };

let urls: string[] = [];
beforeEach(() => {
  localStorage.clear();
  urls = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const u = String(url);
    urls.push(u);
    const body = u.startsWith("/media/products/specs.json") ? SPECS
      : u.startsWith("/api/sizes") ? CHART
      : u.startsWith("/api/products?") ? { items: [card("rib-crew", "Rib Crew", ["#23211D", "#1F2A44"]), card("argyle-crew", "Argyle Crew", []), card("no-drawing", "Mystery", [])], totalItems: 3, page: 0, size: 12, totalPages: 1 }
      : {};
    return new Response(JSON.stringify(body), { status: 200 });
  });
});
afterEach(() => vi.restoreAllMocks());

describe("the fitting room", () => {
  it("rates every height for every pair of shoes, and always has a best choice", () => {
    for (const shoe of SHOE_LIST) {
      expect(Object.keys(FIT[shoe]).sort()).toEqual([...CUTS].sort());
      expect(CUTS.some((c) => FIT[shoe][c] === 2)).toBe(true);
    }
    expect(FIT.boots["no-show"]).toBe(0);
    expect(FIT.loafers["no-show"]).toBe(2);
  });

  it("puts the shop's own socks of the chosen height on the leg, with advice for the shoes", async () => {
    wrap(<FittingRoom />);
    expect(await screen.findByText("Rib Crew", { selector: "strong" })).toBeInTheDocument();
    // only socks with a drawing are offered
    expect(screen.queryByRole("button", { name: /Mystery/ })).not.toBeInTheDocument();
    expect(urls.some((u) => u.includes("cut=crew") && u.includes("category=MEN"))).toBe(true);
    expect(screen.getByText(/Crew with trainers: just right/)).toBeInTheDocument();
    expect(await screen.findByText("Men")).toBeInTheDocument();          // shoe size 42 -> men's socks

    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Boots" }));
    await user.click(screen.getByRole("radio", { name: /^No-show/ }));
    expect(screen.getByText(/No-show with boots: better not/)).toBeInTheDocument();
    expect(screen.getByText(/Better: mid-long, knee-high/)).toBeInTheDocument();
    await waitFor(() => expect(urls.some((u) => u.includes("cut=no-show"))).toBe(true));
  });

  it("changes colour on the leg and links to that colour, and remembers the visitor's choices", async () => {
    wrap(<FittingRoom />);
    const navy = await screen.findByRole("button", { name: "Colour #1F2A44" });
    await userEvent.click(navy);
    expect(navy).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "See this pair" })).toHaveAttribute("href", "/products/rib-crew?colour=1F2A44");
    await userEvent.click(screen.getByRole("radio", { name: "Her" }));
    expect(JSON.parse(localStorage.getItem("akven-fit")!)).toMatchObject({ who: "WOMEN", size: 38 });
  });

  it("opens on a given sock, even when the list would not reach it", async () => {
    const own = card("argyle-crew", "Argyle Crew", []) as never;
    wrap(<FittingRoom initial={{ slug: "argyle-crew", cut: "crew", hex: null, category: "MEN", product: own }} />);
    expect(await screen.findByText("Argyle Crew", { selector: "strong" })).toBeInTheDocument();
  });

  it("reads a product's drawing by colour, and falls back to its own colours", () => {
    expect(specFor(SPECS, "rib-crew", "#1f2a44")).toMatchObject({ main: "#1F2A44", accent: "#c9a24b", pattern: "rib" });
    expect(specFor(SPECS, "rib-crew", "#ABCDEF")?.main).toBe("#4a4d52");
    expect(specFor(SPECS, "missing", null)).toBeUndefined();
  });

  it("draws the height icons only for known cuts", () => {
    expect(isCut("crew")).toBe(true);
    expect(isCut("<script>")).toBe(false);
    const { container } = render(<HeightIcon cut="knee-high" />);
    expect(container.querySelectorAll("path")).toHaveLength(2);
  });
});

describe("the family's own touches", () => {
  it("pins five notes from the stall, each signed", () => {
    wrap(<StallNotes />);
    expect(screen.getByRole("heading", { name: "Notes from the stall" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getAllByText(/— (Venera|Akylbek|the family)/)).toHaveLength(5);
  });

  it("stamps the seal with the shop's name and year", () => {
    const { container } = wrap(<Seal />);
    expect(container.querySelector("textPath")?.textContent).toContain("SINCE 2018");
  });

  it("writes the logo's heart with a pen only when asked", () => {
    const { container, rerender } = render(<Logo />);
    expect(container.querySelector("mask")).toBeNull();
    rerender(<Logo write />);
    expect(container.querySelector("mask .av-logo-pen")).not.toBeNull();
    expect(container.querySelector("path[mask]")).not.toBeNull();
  });

  it("starts the product page on the colour a link asks for", () => {
    const v = (sku: string, color: string, colorHex: string, qty: number) => ({ sku, size: "M", color, colorHex, packSize: 1, casePairs: null, price: 5, availableQty: qty, stockStatus: "IN_STOCK", restockEta: null });
    const product = { slug: "p", name: "P", images: [], variants: [v("a", "Black", "#23211D", 3), v("b", "Navy", "#1F2A44", 2), v("c", "Grey", "#8A8D91", 0)] } as unknown as ProductDetail;
    const wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider>{children}</I18nProvider>;
    expect(renderHook(() => useVariantChoice(product, "#1f2a44"), { wrapper }).result.current.current?.sku).toBe("b");
    expect(renderHook(() => useVariantChoice(product, "#8a8d91"), { wrapper }).result.current.current?.sku).toBe("c");
    expect(renderHook(() => useVariantChoice(product, "#000000"), { wrapper }).result.current.current?.sku).toBe("a");
  });
});
