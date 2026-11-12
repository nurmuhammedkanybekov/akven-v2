import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it } from "vitest";
import type { ProductDetail, VariantView } from "../api/types";
import { I18nProvider } from "../i18n/I18n";
import { useVariantChoice } from "../shop/useVariantChoice";

const variant = (sku: string, color: string, size: string, availableQty: number): VariantView => ({
  sku, color, colorHex: color === "Navy" ? "#1B2A4A" : "#F2E8D5", size, packSize: 1, casePairs: null, price: 9.5,
  availableQty, stockStatus: availableQty > 0 ? "IN_STOCK" : "SOLD_OUT", restockEta: null, restockInDays: null,
});
const product = (variants: VariantView[]): ProductDetail => ({
  slug: "sock", name: "Sock", category: "WOMEN", section: null, cut: null, collection: null, description: null,
  fabricComposition: null, quality: null, care: null, origin: null, images: [], variants,
});
const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

// The owners can add the same colour and size twice; the server may list the two in either order.
it.each([
  ["the empty twin listed first", ["NAVY-M-2", "NAVY-M"]],
  ["the empty twin listed last", ["NAVY-M", "NAVY-M-2"]],
])("picking a colour lands on the option that is in stock (%s)", (_name, order) => {
  const navy = { "NAVY-M": variant("NAVY-M", "Navy", "M", 20), "NAVY-M-2": variant("NAVY-M-2", "Navy", "M", 0) };
  const variants = [variant("CREAM-L", "Cream", "L", 1), ...order.map((sku) => navy[sku as keyof typeof navy])];
  const { result } = renderHook(() => useVariantChoice(product(variants)), { wrapper });
  expect(result.current.current?.sku).toBe("CREAM-L");

  act(() => result.current.pick({ color: "Navy", colorHex: "#1B2A4A" }));
  expect(result.current.current?.sku).toBe("NAVY-M");
  expect(result.current.current?.availableQty).toBe(20);
});

it("still shows a sold-out option when nothing of that colour is left", () => {
  const variants = [variant("CREAM-L", "Cream", "L", 1), variant("NAVY-M", "Navy", "M", 0)];
  const { result } = renderHook(() => useVariantChoice(product(variants)), { wrapper });
  act(() => result.current.pick({ color: "Navy", colorHex: "#1B2A4A" }));
  expect(result.current.current?.sku).toBe("NAVY-M");
});
