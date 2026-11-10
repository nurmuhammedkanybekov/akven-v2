import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { VariantCard } from "../admin/VariantCard";
import type { AdminVariant } from "../api/types";
import { ToastProvider } from "../components/Toast";

const V: AdminVariant = { id: "v1", sku: "LG-1", size: "M", color: "Black", colorHex: "#1f1d1a", packSize: 1, price: 8, costPrice: 4,
  marginFloorPct: 15, stockQty: 10, reservedQty: 0, availableQty: 10, active: true, version: 3, casePairs: null, incomingQty: 30, restockEta: "2026-12-01" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.restoreAllMocks());

it("goods that arrived are sent as an amount to add, never as a new total, and the card and history follow", async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null });
    if (u === "/api/admin/variants/v1/receive") return json({ ...V, stockQty: 30, availableQty: 30, incomingQty: 10, version: 4 });
    if (u === "/api/admin/variants/v1/stock") return json([
      { id: "m2", delta: 20, reason: "RECEIVED", stockAfter: 30, orderId: null, actor: "staff@akven.test", note: "Delivery 14", at: "2026-11-10T08:00:00Z" },
      { id: "m1", delta: -2, reason: "SALE", stockAfter: 10, orderId: "o1", actor: null, note: null, at: "2026-11-09T08:00:00Z" },
    ]);
    return json({}, 404);
  });
  render(<MemoryRouter><ToastProvider><VariantCard variant={V} isAdmin={false} onSaved={() => {}} /></ToastProvider></MemoryRouter>);

  await userEvent.type(screen.getByLabelText("Pairs that arrived"), "20");
  await userEvent.type(screen.getByLabelText(/Note/), "Delivery 14");
  await userEvent.click(screen.getByRole("button", { name: "Add to stock" }));

  expect(calls.find((c) => c.url.endsWith("/receive"))?.body).toEqual({ quantity: 20, note: "Delivery 14" });
  expect(await screen.findByLabelText("In stock")).toHaveValue(30);
  expect(screen.getByLabelText("On the way")).toHaveValue(10);

  await userEvent.click(screen.getByText("Stock history"));
  const table = await screen.findByRole("table");
  expect(within(table).getByText("+20")).toBeInTheDocument();
  expect(within(table).getByText("Goods arrived")).toBeInTheDocument();
  expect(within(table).getByText("−2")).toBeInTheDocument();
  expect(within(table).getByRole("link", { name: "Order" })).toHaveAttribute("href", "/admin/orders/o1");
});
