import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { CartProvider } from "../cart/CartContext";
import { ToastProvider } from "../components/Toast";
import { I18nProvider } from "../i18n/I18n";
import { CheckoutPage } from "../pages/Checkout";
import { OrderDetailPage } from "../pages/OrderDetail";
import { resetGiftCache } from "../shop/useGift";

const LINE = { sku: "SOCK-1", productSlug: "sock", productName: "Mid-Long Sock", variantLabel: "Navy, M", colorHex: "#1F2A44", imageUrl: null, unitPrice: 9.5, quantity: 2 };
const QUOTE = { lines: [{ ...LINE, listPrice: 9.5, discountPct: 0, lineTotal: 19, availableQty: 10, problem: "NONE", note: null }], total: 19, canCheckout: true };
const ID = "22222222-2222-2222-2222-222222222222";
const ORDER = { id: ID, reference: "AV-22222222", status: "PAID", total: 19, createdAt: "2026-11-01T10:00:00Z", paidAt: "2026-11-01T10:00:01Z",
  fulfilledAt: null, cancelledAt: null, fulfillment: { method: "PICKUP", contactName: "Aida", contactPhone: "+996 700 123 456", address: null, note: null },
  payment: { method: "GOOGLE_PAY", reference: "…abcd1234" }, items: [], customerEmail: null, guest: true, pickup: { code: "123456", point: null } };

interface Call { url: string; method: string; headers: Record<string, string>; body: any }
let calls: Call[] = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function server(handler: (c: Call) => Response) {
  calls = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const c: Call = { url: String(url), method: init?.method ?? "GET", headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(c);
    if (c.url === "/api/shop/delivery-zones") return json([]);
    if (c.url.startsWith("/api/shop/info")) return json({ payments: "SIMULATED", contacts: [], pickupPoints: [] });
    return handler(c);
  });
}
function Where() { const l = useLocation(); return <p>at {l.pathname}{l.hash}</p>; }
function show(path: string, page: "checkout" | "order") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider><AuthProvider><ToastProvider><CartProvider>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:id" element={page === "order" ? <OrderDetailPage /> : <Where />} />
        </Routes>
      </CartProvider></ToastProvider></AuthProvider></I18nProvider>
    </MemoryRouter>);
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetGiftCache(); });
afterEach(() => vi.restoreAllMocks());

describe("checkout without an account", () => {
  it("asks for an email, sends it with the order, and opens the order at its private link", async () => {
    server((c) => (c.url === "/api/cart/quote" ? json(QUOTE) : json({ ...ORDER, accessToken: "secret-key-123" }, 201)));
    localStorage.setItem("akven-cart-v1", JSON.stringify([LINE]));
    show("/checkout", "checkout");
    const user = userEvent.setup();
    expect(await screen.findByText("No account needed.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Remember my details/)).toBeNull();          // nothing to remember them in
    await user.type(screen.getByLabelText("Name"), "Aida");
    await user.type(screen.getByLabelText("Phone"), "+996 700 123 456");
    await user.type(screen.getByLabelText("Email"), "aida@");
    await user.click(screen.getByRole("button", { name: /Pay with Google Pay/ }));
    expect(await screen.findByText("Enter an email like name@example.com.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "example.com");
    await user.click(screen.getByRole("button", { name: /Pay with Google Pay/ }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /Pay \$/ }));
    expect(await screen.findByText(`at /orders/${ID}#t=secret-key-123`)).toBeInTheDocument();
    expect(calls.find((c) => c.url === "/api/orders")!.body.email).toBe("aida@example.com");
  });
});

describe("a guest's order page", () => {
  it("sends the link's key as a header, never in the address, and says how to keep the link", async () => {
    server((c) => (c.url === `/api/orders/${ID}` ? json(ORDER) : json({}, 404)));
    show(`/orders/${ID}#t=secret-key-123`, "order");
    expect(await screen.findByText(/This page is your order's private link/)).toBeInTheDocument();
    const get = calls.find((c) => c.url === `/api/orders/${ID}`)!;
    expect(get.headers["X-Order-Token"]).toBe("secret-key-123");
    expect(get.url).not.toContain("secret");
  });

  it("without the key, offers to email the link again", async () => {
    server((c) => (c.url === "/api/orders/find" ? new Response(null, { status: 202 }) : json({ status: 404, title: "Not Found", detail: "Order not found." }, 404)));
    show(`/orders/${ID}`, "order");
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: "This order opens with its private link" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "aida@example.com");
    await user.type(screen.getByLabelText(/Order number/), "av-22222222");
    await user.click(screen.getByRole("button", { name: "Email me the link" }));
    expect(await screen.findByText(/If AV-22222222 was ordered with that email, its link is on the way/)).toBeInTheDocument();
    expect(calls.find((c) => c.url === "/api/orders/find")!.body).toEqual({ email: "aida@example.com", reference: "AV-22222222" });
  });
});
