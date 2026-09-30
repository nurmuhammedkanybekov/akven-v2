import { ApiError } from "../api/client";
import { adminCreateVariant } from "../api/endpoints";
import type { AdminVariant, VariantCreateInput } from "../api/types";

/**
 * Creates a colour/size option. When the code (SKU) was made for the owner (not typed by them) and it is already
 * taken, which happens for any two products with similar names, it quietly tries "-2", "-3"... instead of making
 * the owner deal with it. A code the owner typed themselves is never changed: they get the error.
 */
export async function createVariantWithUniqueSku(productId: string, input: VariantCreateInput, autoSku: boolean): Promise<AdminVariant> {
  let sku = input.sku;
  for (let attempt = 2; ; attempt++) {
    try {
      return await adminCreateVariant(productId, { ...input, sku });
    } catch (e) {
      const taken = e instanceof ApiError && e.status === 409 && /SKU/i.test(e.message);
      if (!autoSku || !taken || attempt > 25) throw e;
      sku = `${input.sku.slice(0, 60)}-${attempt}`;
    }
  }
}
