import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { I18nProvider } from "../i18n/I18n";
import { CatalogPage } from "../pages/Catalog";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const FACETS = { category: { MEN: 1, WOMEN: 0, KIDS: 0, BUNDLES: 0 }, section: [], cut: [], size: [], color: [] };
afterEach(() => { vi.restoreAllMocks(); });

it("filters a shelf by a price band and sends the band to the server in dollars", async () => {
  const urls: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const u = String(input);
    urls.push(u);
    if (u.startsWith("/api/products/facets")) return json(FACETS);
    if (u.startsWith("/api/products")) return json({ items: [], totalItems: 0, page: 0, size: 12, totalPages: 0 });
    return json({});
  });
  render(<MemoryRouter initialEntries={["/shop"]}><I18nProvider><AuthProvider><CatalogPage /></AuthProvider></I18nProvider></MemoryRouter>);

  const under = await screen.findByRole("button", { name: /^Under / });
  await userEvent.click(under);
  await waitFor(() => expect(urls.some((u) => u.startsWith("/api/products?") && u.includes("maxPrice=3.99") && !u.includes("minPrice"))).toBe(true));
  expect(urls.some((u) => u.startsWith("/api/products/facets") && u.includes("maxPrice=3.99"))).toBe(true);
  // the chosen band shows as a tag that removes it
  expect(screen.getByRole("button", { name: /Under .*/, pressed: true })).toBeInTheDocument();

  await userEvent.click(await screen.findByRole("button", { name: /and up$/ }));
  await waitFor(() => expect(urls.some((u) => u.startsWith("/api/products?") && u.includes("minPrice=7") && !u.includes("maxPrice"))).toBe(true));
});
