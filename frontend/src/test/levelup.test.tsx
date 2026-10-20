import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { CartProvider, useCart } from "../cart/CartContext";
import { BagDrawer } from "../components/BagDrawer";
import { SearchOverlay } from "../components/SearchOverlay";
import { Stars } from "../components/Stars";
import { resetSavedCache, useSaved, useSavedSync } from "../shop/useSaved";

const card = (slug: string, name: string) => ({ slug, name, category: "MEN", section: { slug: "classic", name: "Classic" }, cut: null, collection: null,
  minPrice: 5, minPairPrice: 5, variantCount: 2, inStock: true, colors: [], image: null, hoverImage: null });

let calls: Array<{ url: string; method: string }> = [];
function mockFetch(handler: (url: string, method: string) => unknown) {
  calls = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const method = init?.method ?? "GET";
    calls.push({ url: String(url), method });
    return new Response(JSON.stringify(handler(String(url), method)), { status: 200 });
  });
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetSavedCache(); });
afterEach(() => vi.restoreAllMocks());

function Where() { return <p data-testid="where">{useLocation().pathname + useLocation().search}</p>; }

describe("instant search", () => {
  it("shows results as you type, moves with the arrow keys and opens the chosen sock", async () => {
    mockFetch((url) => (url.startsWith("/api/products?") ? { items: [card("argyle-crew", "Argyle Crew"), card("argyle-knee", "Argyle Knee-High")], totalItems: 2, page: 0, size: 6, totalPages: 1 } : {}));
    render(<MemoryRouter><SearchOverlay open onClose={() => undefined} /><Where /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByRole("combobox"), "argyle");
    expect(await screen.findByRole("option", { name: /Argyle Knee-High/ })).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("q=argyle"))).toBe(true);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", expect.stringContaining("-1"));
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("where").textContent).toBe("/products/argyle-knee");
    expect(JSON.parse(localStorage.getItem("akven-recent-searches")!)).toEqual(["argyle"]);
  });

  it("sends Enter without a choice to the catalogue with the search", async () => {
    mockFetch(() => ({ items: [], totalItems: 0, page: 0, size: 6, totalPages: 0 }));
    render(<MemoryRouter><SearchOverlay open onClose={() => undefined} /><Where /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByRole("combobox"), "wool");
    await screen.findByText(/Nothing found for “wool”/);
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("where").textContent).toBe("/shop?q=wool");
  });
});

describe("the bag drawer", () => {
  function Add() {
    const cart = useCart();
    return <button type="button" onClick={() => cart.add({ sku: "S-1", productSlug: "argyle-crew", productName: "Argyle Crew", variantLabel: "Navy, M", colorHex: null, imageUrl: null, unitPrice: 5 }, 2)}>add</button>;
  }
  it("slides in with what was added, the collection progress and a sock for someone else in the family", async () => {
    mockFetch((url) => {
      if (url.includes("/matching")) return [card("argyle-women", "Argyle Crew for her")];
      if (url === "/api/cart/quote") return { lines: [], total: 10, canCheckout: false, collection: { totalPairs: 2, minimumPairs: 10, tierDiscountPct: 0, nextTier: null, minimumMessage: "min" } };
      return {};
    });
    render(<MemoryRouter><AuthProvider><CartProvider><Add /><BagDrawer /></CartProvider></AuthProvider></MemoryRouter>);
    expect(screen.queryByText("Added to your bag")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "add" }));
    expect(await screen.findByRole("heading", { name: "Added to your bag" })).toBeInTheDocument();
    expect(screen.getByText("Navy, M · ×2")).toBeInTheDocument();
    expect(await screen.findByText("Argyle Crew for her")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Your collection" })).toBeInTheDocument();
  });

  it("stays shut on the bag page itself", async () => {
    mockFetch(() => ({}));
    render(<MemoryRouter initialEntries={["/cart"]}><AuthProvider><CartProvider><Routes><Route path="/cart" element={<><Add /><BagDrawer /></>} /></Routes></CartProvider></AuthProvider></MemoryRouter>);
    await userEvent.setup().click(screen.getByRole("button", { name: "add" }));
    expect(screen.queryByRole("heading", { name: "Added to your bag" })).toBeNull();
  });
});

describe("stars", () => {
  it("read out the rating", () => {
    render(<Stars value={4.5} />);
    expect(screen.getByRole("img", { name: "4.5 out of 5" })).toBeInTheDocument();
  });
});

describe("saved socks in the account", () => {
  it("merges the browser's list on sign-in and sends later changes to the account", async () => {
    localStorage.setItem("akven-saved", JSON.stringify([{ slug: "local-sock", name: "Local", image: null, price: 3 }]));
    mockFetch((url, method) => {
      if (url === "/api/saved/merge") return [card("local-sock", "Local"), card("phone-sock", "From the phone")];
      if (method === "PUT" || method === "DELETE") return [];
      return [];
    });
    const { result, rerender } = renderHook(({ email }) => { useSavedSync(email); return useSaved(); }, { initialProps: { email: null as string | null } });
    rerender({ email: "aida@akven.test" });
    await waitFor(() => expect(result.current.items.map((i) => i.slug)).toEqual(["local-sock", "phone-sock"]));
    act(() => result.current.toggle({ slug: "new-sock", name: "New", image: null, price: 4 }));
    act(() => result.current.remove("local-sock"));
    expect(calls).toEqual(expect.arrayContaining([
      { url: "/api/saved/merge", method: "POST" }, { url: "/api/saved/new-sock", method: "PUT" }, { url: "/api/saved/local-sock", method: "DELETE" }]));
  });
});
