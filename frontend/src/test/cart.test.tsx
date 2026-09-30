import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, MAX_PER_LINE, readCart, useCart, type CartLine } from "../cart/CartContext";
import { newId } from "../lib/ids";
import { newWalletToken } from "../lib/wallet";

const sock = (sku: string): Omit<CartLine, "quantity"> => ({ sku, productSlug: "s", productName: "Sock " + sku, variantLabel: "Navy, M", colorHex: "#1F2A44", imageUrl: null, unitPrice: 10 });

let api: ReturnType<typeof useCart>;
function Probe() { api = useCart(); return <p>count:{api.count} lines:{api.lines.length}</p>; }
const mount = () => render(<CartProvider><Probe /></CartProvider>);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("the bag", () => {
  it("merges the same item, counts pairs, and never exceeds what is in stock", () => {
    mount();
    act(() => api.add(sock("A"), 2, 5));
    act(() => api.add(sock("A"), 2, 5));
    expect(api.lines).toHaveLength(1);
    expect(api.lines[0].quantity).toBe(4);
    act(() => api.add(sock("A"), 9, 5));                     // asking for more than the 5 in stock stops at 5
    expect(api.lines[0].quantity).toBe(5);
    act(() => api.add(sock("B"), 1));
    expect(api.count).toBe(6);
  });

  it("removes a line when its quantity drops below one, and caps at 99", () => {
    mount();
    act(() => api.add(sock("A"), 3));
    act(() => api.setQuantity("A", 500));
    expect(api.lines[0].quantity).toBe(MAX_PER_LINE);
    act(() => api.setQuantity("A", 0));
    expect(api.lines).toHaveLength(0);
  });

  it("survives a reload: the saved bag comes back", () => {
    const first = mount();
    act(() => api.add(sock("A"), 2));
    first.unmount();
    mount();
    expect(screen.getByText("count:2 lines:1")).toBeInTheDocument();
  });

  it("drops anything damaged or hand-edited instead of trusting it", () => {
    localStorage.setItem("akven-cart-v1", JSON.stringify([
      { ...sock("OK"), quantity: 2 },
      { ...sock("NEGATIVE"), quantity: -5 },
      { ...sock("HUGE"), quantity: 100000 },
      { sku: 7, quantity: 1 },
      "garbage",
    ]));
    expect(readCart().map((l) => l.sku)).toEqual(["OK"]);
    localStorage.setItem("akven-cart-v1", "{not json");
    expect(readCart()).toEqual([]);
  });

  it("follows changes made in another tab", () => {
    mount();
    act(() => {
      localStorage.setItem("akven-cart-v1", JSON.stringify([{ ...sock("FROM-OTHER-TAB"), quantity: 3 }]));
      window.dispatchEvent(new StorageEvent("storage", { key: "akven-cart-v1" }));
    });
    expect(screen.getByText("count:3 lines:1")).toBeInTheDocument();
  });

  it("keeps working when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    mount();
    act(() => api.add(sock("A"), 1));
    expect(api.count).toBe(1);                               // held in memory for this visit
  });
});

describe("wallet tokens and ids", () => {
  it("makes tokens the server accepts, and a declined variant on request", () => {
    expect(newWalletToken("APPLE_PAY")).toMatch(/^sim_apple_[A-Za-z0-9]{12,64}$/);
    expect(newWalletToken("GOOGLE_PAY")).toMatch(/^sim_google_[A-Za-z0-9]{12,64}$/);
    expect(newWalletToken("APPLE_PAY", true)).toContain("declined");
    expect(newWalletToken("APPLE_PAY", true)).toMatch(/^sim_apple_[A-Za-z0-9]{12,64}$/);
    expect(newWalletToken("APPLE_PAY")).not.toBe(newWalletToken("APPLE_PAY"));
  });

  it("never looks like a card number", () => {
    for (let i = 0; i < 50; i++) expect(newWalletToken("APPLE_PAY")).not.toMatch(/^[0-9][0-9 \-]{11,}$/);
  });

  it("makes unique UUIDs even where crypto.randomUUID does not exist (plain http)", () => {
    const id = newId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const fallback = newId();
      expect(fallback).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(fallback).not.toBe(newId());
    } finally { Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true }); }
  });
});
