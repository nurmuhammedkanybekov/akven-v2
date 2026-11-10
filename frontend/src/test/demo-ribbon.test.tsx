import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

// The shop's info is fetched once per visit and shared, so each case loads the component afresh.
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); document.head.querySelector('meta[name="robots"]')?.remove(); });

async function renderWith(payments: "SIMULATED" | "NONE") {
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ contacts: [], pickupPoints: [], payments }));
  const { DemoNote, useDemoMode } = await import("../components/DemoRibbon");
  // The header shows the note in place of its rotating messages; this stands in for that choice.
  function Bar() { return useDemoMode() ? <DemoNote /> : null; }
  render(<MemoryRouter><Bar /></MemoryRouter>);
}

it("in demo mode, every page says that orders and payments are not real and asks search engines not to list it", async () => {
  await renderWith("SIMULATED");
  expect(await screen.findByRole("note")).toHaveTextContent(/orders and payments here are not real/);
  expect(screen.getByRole("link", { name: "Buy at the stall" })).toHaveAttribute("href", "/visit");
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

it("a real shop shows no demo line and stays listed", async () => {
  await renderWith("NONE");
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});
