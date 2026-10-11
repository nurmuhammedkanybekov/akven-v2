import { useMemo, useState } from "react";
import type { ProductDetail, VariantView } from "../api/types";
import { useT } from "../i18n/I18n";

/**
 * Choosing a colour, size and pack for one product, shared by the product page and the quick view so both behave the
 * same. Starts on the first option in stock; picking one option keeps the others where possible, so changing colour
 * does not reset the size.
 */
export function useVariantChoice(product: ProductDetail) {
  const { t } = useT();
  const variants = product.variants;
  const [sku, setSku] = useState(() => (variants.find((v) => v.availableQty > 0) ?? variants[0])?.sku);
  const current: VariantView | undefined = variants.find((v) => v.sku === sku);

  const colors = useMemo(() => {
    const seen = new Map<string, VariantView>();
    for (const v of variants) { const key = `${v.color ?? ""}|${v.colorHex ?? ""}`; if (!seen.has(key)) seen.set(key, v); }
    return [...seen.values()];
  }, [variants]);
  const sameColor = variants.filter((v) => v.color === current?.color && v.colorHex === current?.colorHex);
  const sizes = [...new Set(sameColor.map((v) => v.size).filter((s): s is string => !!s))];
  const packs = [...new Set(sameColor.filter((v) => v.size === current?.size).map((v) => v.packSize).filter((p): p is number => p !== null))];

  function pick(change: Partial<Pick<VariantView, "color" | "colorHex" | "size" | "packSize">>) {
    const want = { color: current?.color, colorHex: current?.colorHex, size: current?.size, packSize: current?.packSize, ...change };
    const score = (v: VariantView) => (v.color === want.color ? 4 : 0) + (v.colorHex === want.colorHex ? 4 : 0) + (v.size === want.size ? 2 : 0) + (v.packSize === want.packSize ? 1 : 0);
    const best = [...variants].filter((v) => Object.entries(change).every(([k, val]) => v[k as keyof VariantView] === val))
      .sort((a, b) => score(b) - score(a))[0];
    if (best) setSku(best.sku);
  }

  /** "Navy, M, 3 pairs": how the option is named in the bag. */
  const label = (v: VariantView) => [v.color, v.size, v.packSize && v.packSize > 1 ? t("pdp.pairsN", { n: v.packSize }) : null].filter(Boolean).join(", ") || null;

  return { current, colors, sizes, packs, pick, label };
}
