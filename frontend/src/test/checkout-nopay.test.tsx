import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { CartProvider } from "../cart/CartContext";
import { ToastProvider } from "../components/Toast";
import { CheckoutPage } from "../pages/Checkout";

// A file of its own: the shop's info is fetched once per visit and shared, so it must not meet other tests' answers.
const LINE = { sku: "SOCK-1", productSlug: "sock", productName: "Mid-Long Sock", variantLabel: "Navy, M", colorHex: "#1F2A44", imageUrl: null, unitPrice: 9.5, quantity: 2 };
const QUOTE = { lines: [{ ...LINE, listPrice: 9.5, discountPct: 0, lineTotal: 19, availableQty: 10, problem: "NONE", note: null }], total: 19, canCheckout: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

it("says plainly that payments are not set up when the shop runs without demo mode, and offers no wallet", async () => {
  const urls: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    urls.push(String(url));
    if (String(url) === "/api/cart/quote") return json(QUOTE);
    if (String(url) === "/api/shop/info") return json({ contacts: [], pickupPoints: [], payments: "NONE" });
    if (String(url) === "/api/shop/delivery-zones") return json([]);
    return json({}, 404);
  });
  sessionStorage.setItem("akven-session", JSON.stringify({ token: "t", email: "aida@akven.test", role: "CUSTOMER" }));
  localStorage.setItem("akven-cart-v1", JSON.stringify([LINE]));
  render(
    <MemoryRouter initialEntries={["/checkout"]}>
      <AuthProvider><ToastProvider><CartProvider>
        <Routes><Route path="/checkout" element={<CheckoutPage />} /></Routes>
      </CartProvider></ToastProvider></AuthProvider>
    </MemoryRouter>);
  expect(await screen.findByText(/Online payment isn't set up yet/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Pay with Apple Pay/ })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /send your order to the family as a message/ })).toHaveAttribute("href", "/cart");
  expect(urls).not.toContain("/api/orders");
});
