import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaseBuilder } from "../shop/wholesale/CaseBuilder";

const SUMMARY = { slug: "rib-crew", name: "Rib Crew", category: "WOMEN", section: { slug: "classic", name: "Classic" }, cut: null, collection: null,
  minPrice: 2, minPairPrice: 2, variantCount: 3, inStock: true, colors: ["#23211D", "#1F2A44"], image: null };
const variant = (sku: string, color: string, colorHex: string, size: string, availableQty: number, packSize: number | null = null, price = 2) =>
  ({ sku, color, colorHex, size, packSize, casePairs: null, price, availableQty, stockStatus: "IN_STOCK", restockEta: null, restockInDays: null });
const DETAIL = { ...SUMMARY, description: null, fabricComposition: null, quality: null, care: null, origin: null, images: [],
  variants: [variant("RC-BLK-M", "Black", "#23211D", "M", 100), variant("RC-NVY-M", "Navy", "#1F2A44", "M", 6), variant("RC-3P", "Mixed", "#888888", "M", 10, 3, 5)] };
const PRICING = { minOrderPairs: 1, tiers: [{ minPairs: 12, discountPct: 5 }, { minPairs: 120, discountPct: 10 }] };

let asked: string[] = [];
beforeEach(() => {
  localStorage.clear();
  asked = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const u = String(url);
    asked.push(u);
    const body = u.startsWith("/api/pricing") ? PRICING
      : u.startsWith("/api/products/rib-crew") ? DETAIL
      : u.startsWith("/api/products") ? { items: u.includes("q=zzz") ? [] : [SUMMARY], page: 0, size: 12, totalElements: 1, totalPages: 1 } : {};
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => { vi.restoreAllMocks(); });

const open = async () => { fireEvent.click(await screen.findByRole("button", { name: /Rib Crew/ })); return screen.findByRole("table"); };

describe("the wholesale case builder", () => {
  it("never shows a dead grey button: with an empty case it says how to fill one and moves to the search", async () => {
    const onUse = vi.fn();
    render(<CaseBuilder onUse={onUse} />);
    const use = await screen.findByRole("button", { name: "Put this mix in my request" });
    expect(use).toBeEnabled();
    expect(use).toHaveAccessibleDescription(/Your case is empty/);
    fireEvent.click(use);
    expect(onUse).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Find a sock by name" })).toHaveFocus());
  });

  it("collects the exact colours and sizes, by the dozen, and hands the list to the request", async () => {
    const onUse = vi.fn();
    render(<CaseBuilder onUse={onUse} />);
    const table = await open();
    expect(within(table).getByText("100")).toBeInTheDocument();
    fireEvent.click(within(table).getByRole("button", { name: "Twelve more: Rib Crew, Black M" }));
    fireEvent.click(within(table).getByRole("button", { name: "Twelve more: Rib Crew, Black M" }));
    fireEvent.click(within(table).getByRole("button", { name: "Twelve more: Rib Crew, Navy M" }));
    // Navy has only 6 pairs today: the shop is told before it asks, not after.
    expect(within(table).getByText("More than we have now")).toBeInTheDocument();
    const yours = screen.getByRole("complementary", { name: "Your case" });
    expect(within(yours).getByText("36 pairs")).toBeInTheDocument();
    expect(within(yours).getByText(/204 to a full case/)).toBeInTheDocument();
    expect(within(yours).getByText(/Step −5% \(from 12 pairs\)/)).toBeInTheDocument();
    expect(within(yours).getByText(/84 more pairs .* −10%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Put this mix in my request" }));
    expect(onUse).toHaveBeenCalledWith("Rib Crew, Black, M × 24 (RC-BLK-M)\nRib Crew, Navy, M × 12 (RC-NVY-M)", 36);
  });

  it("counts a pack's stock and price in pairs", async () => {
    render(<CaseBuilder onUse={vi.fn()} />);
    const table = await open();
    expect(within(table).getByText("30")).toBeInTheDocument(); // 10 packs of three
    expect(within(table).getByText(/pack of 3/)).toBeInTheDocument();
    fireEvent.click(within(table).getByRole("button", { name: "Twelve more: Rib Crew, Mixed M (pack of 3)" }));
    const yours = screen.getByRole("complementary", { name: "Your case" });
    // 12 pairs at 5/3 a pair = 20 before the step.
    expect(within(yours).getByText("At shelf prices").nextElementSibling?.textContent).toMatch(/20/);
    const onUse = vi.fn();
    render(<CaseBuilder onUse={onUse} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Put this mix in my request" }).at(-1)!);
    expect(onUse).toHaveBeenCalledWith("Rib Crew, Mixed, M, pack of 3 × 12 (RC-3P)", 12);
  });

  it("keeps the case on this device until it is sent", async () => {
    const { unmount } = render(<CaseBuilder onUse={vi.fn()} />);
    fireEvent.click(within(await open()).getByRole("button", { name: "Twelve more: Rib Crew, Black M" }));
    unmount();
    render(<CaseBuilder onUse={vi.fn()} />);
    expect(within(screen.getByRole("complementary", { name: "Your case" })).getByText("12 pairs")).toBeInTheDocument();
  });

  it("searches the whole shop by name and says when nothing is called that", async () => {
    render(<CaseBuilder onUse={vi.fn()} />);
    await screen.findByRole("button", { name: /Rib Crew/ });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    await screen.findByText(/No sock by that name/);
    expect(asked.some((u) => u.includes("q=zzz") && !u.includes("category="))).toBe(true);
  });
});
