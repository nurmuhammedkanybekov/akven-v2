import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { CartProvider, readCart } from "../cart/CartContext";
import { ToastProvider } from "../components/Toast";
import { CartPage } from "../pages/Cart";
import { CheckoutPage } from "../pages/Checkout";

const LINE = { sku: "SOCK-1", productSlug: "sock", productName: "Mid-Long Sock", variantLabel: "Navy, M", colorHex: "#1F2A44", imageUrl: null, unitPrice: 9.5, quantity: 2 };
const QUOTE_OK = { lines: [{ sku: "SOCK-1", productSlug: "sock", productName: "Mid-Long Sock", variantLabel: "Navy, M", colorHex: "#1F2A44", imageUrl: null, quantity: 2,
  listPrice: 9.5, discountPct: 0, unitPrice: 9.5, lineTotal: 19, availableQty: 10, problem: "NONE", note: null }], total: 19, canCheckout: true };
const ORDER = { id: "11111111-1111-1111-1111-111111111111", reference: "AV-11111111", status: "PAID", total: 19, createdAt: "2026-10-01T10:00:00Z", paidAt: "2026-10-01T10:00:01Z",
  fulfilledAt: null, cancelledAt: null, fulfillment: { method: "PICKUP", contactName: "Aida", contactPhone: "+996 700 123 456", address: null, note: null },
  payment: { method: "APPLE_PAY", reference: "…abcd1234" }, items: [], customerEmail: null };

interface Call { url: string; method: string; headers: Record<string, string>; body: any }
let calls: Call[] = [];
function mockServer(handler: (c: Call) => Response | Promise<Response> | Error) {
  calls = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const call: Call = { url: String(url), method: init?.method ?? "GET", headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);
    const r = handler(call);
    if (r instanceof Error) throw r;
    return r;
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function renderCheckout() {
  sessionStorage.setItem("akven-session", JSON.stringify({ token: "t", email: "aida@akven.test", role: "CUSTOMER" }));
  localStorage.setItem("akven-cart-v1", JSON.stringify([LINE]));
  return render(
    <MemoryRouter initialEntries={["/checkout"]}>
      <AuthProvider><ToastProvider><CartProvider>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:id" element={<p>order page</p>} />
          <Route path="/cart" element={<p>cart page</p>} />
        </Routes>
      </CartProvider></ToastProvider></AuthProvider>
    </MemoryRouter>);
}

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Aida");
  await user.type(screen.getByLabelText("Phone"), "+996 700 123 456");
}
const orderCalls = () => calls.filter((c) => c.url === "/api/orders");

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

describe("checkout", () => {
  it("asks for contact details before opening the wallet, and sends nothing while they are missing", async () => {
    mockServer((c) => (c.url === "/api/cart/quote" ? json(QUOTE_OK) : json({}, 500)));
    renderCheckout();
    await screen.findByText("Mid-Long Sock", { exact: false });
    await userEvent.setup().click(screen.getByRole("button", { name: "Pay with Apple Pay" }));
    expect(await screen.findByText("Tell us who to ask for.")).toBeInTheDocument();
    expect(screen.getByText("Enter a phone number we can reach you on.")).toBeInTheDocument();
    expect(orderCalls()).toHaveLength(0);
  });

  it("pays with a wallet token and an idempotency key, never a price or a card number, then empties the bag", async () => {
    mockServer((c) => (c.url === "/api/cart/quote" ? json(QUOTE_OK) : json(ORDER, 201)));
    renderCheckout();
    const user = userEvent.setup();
    await screen.findByText("Mid-Long Sock", { exact: false });
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Pay with Apple Pay" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: /Pay \$19\.00/ }));

    await screen.findByText("order page");
    const [order] = orderCalls();
    expect(order.method).toBe("POST");
    expect(order.headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(order.headers.Authorization).toBe("Bearer t");
    expect(order.body.payment.token).toMatch(/^sim_apple_[A-Za-z0-9]{12,64}$/);
    expect(order.body.items).toEqual([{ sku: "SOCK-1", quantity: 2 }]);            // which item and how many: no price anywhere
    expect(JSON.stringify(order.body)).not.toMatch(/price|total|card/i);
    expect(readCart()).toEqual([]);
  });

  it("keeps the bag after a declined payment and uses a NEW key for the next attempt", async () => {
    mockServer((c) => (c.url === "/api/cart/quote" ? json(QUOTE_OK) : json({ detail: "Your bank declined the payment. You have not been charged." }, 402)));
    renderCheckout();
    const user = userEvent.setup();
    await screen.findByText("Mid-Long Sock", { exact: false });
    await fillContact(user);
    for (let attempt = 0; attempt < 2; attempt++) {
      await user.click(screen.getByRole("button", { name: "Pay with Apple Pay" }));
      await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /Pay \$19\.00/ }));
      await screen.findByText(/declined the payment/);
    }
    expect(orderCalls()).toHaveLength(2);
    expect(orderCalls()[0].headers["Idempotency-Key"]).not.toBe(orderCalls()[1].headers["Idempotency-Key"]);
    expect(readCart()).toHaveLength(1);                                             // nothing lost
  });

  it("reuses the same key after a lost connection, because the first request may have gone through", async () => {
    let failOnce = true;
    mockServer((c) => {
      if (c.url === "/api/cart/quote") return json(QUOTE_OK);
      if (failOnce) { failOnce = false; return new TypeError("network down"); }
      return json(ORDER, 200);
    });
    renderCheckout();
    const user = userEvent.setup();
    await screen.findByText("Mid-Long Sock", { exact: false });
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Pay with Apple Pay" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /Pay \$19\.00/ }));
    await screen.findByText(/Cannot reach the server/);
    await user.click(screen.getByRole("button", { name: "Pay with Apple Pay" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /Pay \$19\.00/ }));
    await screen.findByText("order page");
    expect(orderCalls()[0].headers["Idempotency-Key"]).toBe(orderCalls()[1].headers["Idempotency-Key"]);
  });

  it("offers a declined payment on demand for the demo", async () => {
    mockServer((c) => (c.url === "/api/cart/quote" ? json(QUOTE_OK) : json({ detail: "declined" }, 402)));
    renderCheckout();
    const user = userEvent.setup();
    await screen.findByText("Mid-Long Sock", { exact: false });
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Pay with Apple Pay" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByLabelText(/make the bank decline/));
    await user.click(within(sheet).getByRole("button", { name: /Pay \$19\.00/ }));
    await waitFor(() => expect(orderCalls()).toHaveLength(1));
    expect(orderCalls()[0].body.payment.token).toContain("declined");
  });

  it("does not let you pay while something in the bag is unavailable", async () => {
    mockServer(() => json({ ...QUOTE_OK, canCheckout: false, lines: [{ ...QUOTE_OK.lines[0], problem: "SOLD_OUT", note: "Sold out." }] }));
    renderCheckout();
    await screen.findByText(/Something in your bag changed/);
    expect(screen.getByRole("button", { name: "Pay with Apple Pay" })).toBeDisabled();
  });
});

describe("the bag page", () => {
  function renderCart() {
    localStorage.setItem("akven-cart-v1", JSON.stringify([LINE]));
    return render(<MemoryRouter><AuthProvider><ToastProvider><CartProvider><CartPage /></CartProvider></ToastProvider></AuthProvider></MemoryRouter>);
  }

  it("says plainly when there is not enough stock and offers the fix", async () => {
    mockServer(() => json({ ...QUOTE_OK, canCheckout: false, lines: [{ ...QUOTE_OK.lines[0], availableQty: 1, problem: "NOT_ENOUGH_STOCK", note: "Only 1 left." }] }));
    renderCart();
    expect(await screen.findByText("Only 1 left.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check out" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Change to 1" }));
    await waitFor(() => expect(readCart()[0].quantity).toBe(1));
  });

  it("shows the saved bag with a notice when the server cannot be reached", async () => {
    mockServer(() => new TypeError("offline"));
    renderCart();
    expect(await screen.findByText(/You appear to be offline/)).toBeInTheDocument();
    expect(screen.getByText("Mid-Long Sock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check out" })).toBeDisabled();
  });

  it("tells the shopper when a price changed since they added the item", async () => {
    mockServer(() => json({ ...QUOTE_OK, lines: [{ ...QUOTE_OK.lines[0], unitPrice: 11, listPrice: 11, lineTotal: 22 }], total: 22 }));
    renderCart();
    expect(await screen.findByText(/Price is now \$11\.00 \(it was \$9\.50 when you added it\)/)).toBeInTheDocument();
  });

  it("shows an empty state, not an error, for an empty bag", () => {
    render(<MemoryRouter><AuthProvider><ToastProvider><CartProvider><CartPage /></CartProvider></ToastProvider></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Your bag is empty" })).toBeInTheDocument();
  });
});
