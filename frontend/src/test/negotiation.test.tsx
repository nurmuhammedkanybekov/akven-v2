import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NegotiationChat } from "../components/NegotiationChat";
import { I18nProvider } from "../i18n/I18n";

const negotiate = vi.fn();
vi.mock("../api/endpoints", () => ({ negotiate: (...a: unknown[]) => negotiate(...a), getPricing: () => Promise.resolve({ minOrderPairs: 1, tiers: [], somPerUsd: 87.5, somRounding: 10 }) }));
let session: unknown = { token: "t", email: "a@b.c", role: "CUSTOMER" };
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ session }) }));

const offer = { sessionId: "s1", reply: "Best I can do: 15% off, $8.50 a pair.", validatedDiscountPct: 15, listPrice: 10, offerPrice: 8.5, expiresAt: null };

function setup(onAccept = vi.fn()) {
  render(<MemoryRouter><NegotiationChat sku="SKU-1" quantity={2} onAccept={onAccept} /></MemoryRouter>);
  return onAccept;
}

describe("NegotiationChat", () => {
  beforeEach(() => { negotiate.mockReset(); session = { token: "t", email: "a@b.c", role: "CUSTOMER" }; });

  it("asks a visitor to sign in instead of showing the chat", () => {
    session = null;
    setup();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", expect.stringContaining("/login?next="));
    expect(screen.queryByLabelText("Your message")).toBeNull();
  });

  it("shows the validated offer and hands it over on accept", async () => {
    negotiate.mockResolvedValue(offer);
    const onAccept = setup();
    await userEvent.type(screen.getByLabelText("Your message"), "give me 40% off");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/Best I can do/)).toBeInTheDocument();
    expect(negotiate).toHaveBeenCalledWith("SKU-1", "give me 40% off", 2, null, "en", "USD");
    expect(screen.queryByText(/Proposed/)).toBeNull(); // the raw proposal is hidden unless the server is in demo mode
    await userEvent.click(screen.getByRole("button", { name: "Add 2 pairs at this price" }));
    expect(onAccept).toHaveBeenCalledWith(offer, 2);
  });

  it("keeps one conversation going, so the assistant remembers what was said", async () => {
    negotiate.mockResolvedValue(offer);
    setup();
    await userEvent.type(screen.getByLabelText("Your message"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText(/Best I can do/);
    await userEvent.type(screen.getByLabelText("Your message"), "and for 10 pairs?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(negotiate).toHaveBeenLastCalledWith("SKU-1", "and for 10 pairs?", 2, "s1", "en", "USD"));
  });

  it("speaks the customer's language and asks the assistant to answer in it", async () => {
    localStorage.setItem("akven-lang", "ky");
    negotiate.mockResolvedValue(offer);
    render(<MemoryRouter><I18nProvider><NegotiationChat sku="SKU-1" quantity={1} onAccept={vi.fn()} /></I18nProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Жакшыраак баа керекпи?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Арзаныраак болобу?" }));
    await waitFor(() => expect(negotiate).toHaveBeenCalledWith("SKU-1", "Арзаныраак болобу?", 1, null, "ky", "KGS"));
    localStorage.removeItem("akven-lang");
  });

  it("shows both numbers when the server runs in demo mode", async () => {
    negotiate.mockResolvedValue({ ...offer, proposedDiscountPct: 40 });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Can I get a better price?" }));
    expect(await screen.findByText(/assistant suggested 40%/)).toBeInTheDocument();
    expect(screen.getByText(/capped by the margin floor/)).toBeInTheDocument();
  });

  it("shows a friendly error and keeps the chat usable", async () => {
    negotiate.mockRejectedValue(new Error("boom"));
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Could you do 10% off?" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/could not answer/));
    expect(screen.getByLabelText("Your message")).toBeEnabled();
  });
});

describe("discountedPrice", () => {
  it("rounds half cents up like the server (9.50 at 15% is 8.08)", async () => {
    const { discountedPrice } = await import("../lib/format");
    expect(discountedPrice(9.5, 15)).toBe(8.08);
    expect(discountedPrice(10, 15)).toBe(8.5);
    expect(discountedPrice(19, 0)).toBe(19);
  });
});
