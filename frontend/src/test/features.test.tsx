import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProductDetail } from "../api/types";
import { codeFromPickupQr, pickupQrText } from "../components/QrCode";
import { I18nProvider } from "../i18n/I18n";
import { toSom } from "../shop/useMoney";
import { useVariantChoice } from "../shop/useVariantChoice";

describe("the pickup QR code", () => {
  it("carries the six digits with the shop's prefix, and a scanner reads only ours", () => {
    expect(pickupQrText("123456")).toBe("AKVEN-PICKUP:123456");
    expect(codeFromPickupQr(" AKVEN-PICKUP:123456 ")).toBe("123456");
    expect(codeFromPickupQr("https://example.com")).toBeNull();
    expect(codeFromPickupQr("AKVEN-PICKUP:12345")).toBeNull();
  });
});

describe("prices in roubles", () => {
  it("round the owners' way, like som", () => {
    expect(toSom(7.5, 82, 10)).toBe(620);
    expect(toSom(7.5, 82, 1)).toBe(615);
  });
});

describe("pictures follow the colour", () => {
  const v = (sku: string, color: string, qty = 5) => ({ sku, size: "M", color, colorHex: "#000000", packSize: 1, casePairs: null, price: 5, availableQty: qty,
    stockStatus: "IN_STOCK", restockInDays: null }) as unknown as ProductDetail["variants"][number];
  const product = {
    slug: "s", name: "Sock", variants: [v("A", "Black"), v("B", "Olive")],
    images: [{ url: "/p-1.svg", alt: "" }, { url: "/p--olive-1.svg", alt: "", color: "Olive" }, { url: "/p--olive-2.svg", alt: "", color: "Olive" }],
  } as unknown as ProductDetail;

  it("shows a colour's own pictures, and the product's general ones for a colour without any", () => {
    const { result, rerender } = renderHook(() => useVariantChoice(product), { wrapper: I18nProvider });
    expect(result.current.images.map((i) => i.url)).toEqual(["/p-1.svg"]);
    result.current.pick({ color: "Olive", colorHex: "#000000" });
    rerender();
    expect(result.current.images.map((i) => i.url)).toEqual(["/p--olive-1.svg", "/p--olive-2.svg"]);
  });
});
