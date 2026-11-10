import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { CartProvider } from "../cart/CartContext";
import { ToastProvider } from "../components/Toast";
import { CheckoutPage } from "../pages/Checkout";

// A file of its own: the shop's info is fetched once per visit and shared.
const LINE = { sku: "SOCK-1", productSlug: "sock", productName: "Mid-Long Sock", variantLabel: "Navy, M", colorHex: "#1F2A44", imageUrl: null, unitPrice: 9.5, quantity: 2 };
const QUOTE = { lines: [{ ...LINE, listPrice: 9.5, discountPct: 0, lineTotal: 19, availableQty: 10, problem: "NONE", note: null }], total: 19, canCheckout: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

it("without online payment the shop still takes the order: reserved, paid in person, and no wallet token is sent", async () => {
  const sent: unknown[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const u = String(url);
    if (u === "/api/cart/quote") return json(QUOTE);
    if (u === "/api/shop/info") return json({ contacts: [], pickupPoints: [], payments: "NONE", payAtHandover: true });
    if (u === "/api/shop/delivery-zones") return json([]);
    if (u === "/api/orders") { sent.push(JSON.parse(String(init?.body))); return json({ id: "o1", status: "RESERVED" }, 201); }
    return json({}, 404);
  });
  sessionStorage.setItem("akven-session", JSON.stringify({ token: "t", email: "aida@akven.test", role: "CUSTOMER" }));
  localStorage.setItem("akven-cart-v1", JSON.stringify([LINE]));
  render(
    <MemoryRouter initialEntries={["/checkout"]}>
      <AuthProvider><ToastProvider><CartProvider>
        <Routes><Route path="/checkout" element={<CheckoutPage />} /><Route path="/orders/:id" element={<p>order page</p>} /></Routes>
      </CartProvider></ToastProvider></AuthProvider>
    </MemoryRouter>);

  const reserve = await screen.findByRole("button", { name: "Reserve, pay at the stall" });
  expect(screen.queryByText(/Online payment isn't set up yet/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Apple Pay/ })).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Name"), "Aida");
  await userEvent.type(screen.getByLabelText("Phone"), "+996 700 123 456");
  await userEvent.click(reserve);
  expect(await screen.findByText("order page")).toBeInTheDocument();
  expect(sent).toHaveLength(1);
  expect((sent[0] as { payment: unknown }).payment).toEqual({ method: "PAY_AT_HANDOVER" });
});
