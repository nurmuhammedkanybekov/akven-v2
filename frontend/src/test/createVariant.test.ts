import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { createVariantWithUniqueSku } from "../admin/createVariant";
import { draftToInput, emptyDraft, suggestSku } from "../admin/helpers";
import type { VariantCreateInput } from "../api/types";

const input: VariantCreateInput = { sku: "AVML-NAV-M-1", size: "M", color: "Navy", colorHex: "#1F2A44", packSize: 1, price: 9.5, costPrice: 4, marginFloorPct: 15, stockQty: 5 };
const taken = () => new Response(JSON.stringify({ detail: "A variant with SKU 'AVML-NAV-M-1' already exists." }), { status: 409 });
const created = (sku: string) => new Response(JSON.stringify({ id: "v1", sku }), { status: 201 });
const sentSkus = (mock: ReturnType<typeof vi.spyOn>) => mock.mock.calls.map((c: unknown[]) => JSON.parse(String((c[1] as RequestInit).body)).sku);

afterEach(() => vi.restoreAllMocks());

describe("unique SKUs", () => {
  it("retries a made-for-you SKU with -2, -3 until it is free", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(taken()).mockResolvedValueOnce(taken()).mockResolvedValueOnce(created("AVML-NAV-M-1-3"));
    await createVariantWithUniqueSku("p1", input, true);
    expect(sentSkus(fetchMock)).toEqual(["AVML-NAV-M-1", "AVML-NAV-M-1-2", "AVML-NAV-M-1-3"]);
  });

  it("never rewrites a code the owner typed themselves", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(taken());
    await expect(createVariantWithUniqueSku("p1", input, false)).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not hide other errors behind a retry", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "Price cannot be lower than the cost price." }), { status: 400 }));
    await expect(createVariantWithUniqueSku("p1", input, true)).rejects.toThrow("Price cannot be lower");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("variant drafts", () => {
  it("suggests a short readable code", () => {
    expect(suggestSku("Ak&Ven Mid-Long Socks", "Navy", "M", 1)).toBe("AVML-NAV-M-1");
    expect(suggestSku("ak-ven-socks", null, "One size", null)).toBe("AVS-ONE");
  });

  it("explains what is wrong in plain words", () => {
    const d = { ...emptyDraft(), price: "3", costPrice: "4", stockQty: "1.5" };
    const { errors, input: built } = draftToInput(d, "Socks");
    expect(built).toBeUndefined();
    expect(errors.price).toBe("The price cannot be below the cost.");
    expect(errors.stockQty).toBe("Enter a whole number of pairs.");
  });

  it("builds a clean request and marks an untouched code as auto-made", () => {
    const d = { ...emptyDraft(), color: " Navy ", colorHex: "#1F2A44", size: "M", price: "9.5", costPrice: "4", stockQty: "20" };
    const r = draftToInput(d, "Ak&Ven Mid-Long Socks");
    expect(r.errors).toEqual({});
    expect(r.autoSku).toBe(true);
    expect(r.input).toMatchObject({ color: "Navy", size: "M", price: 9.5, costPrice: 4, stockQty: 20, marginFloorPct: 15, packSize: 1, sku: "AVML-NAV-M-1" });
  });
});
