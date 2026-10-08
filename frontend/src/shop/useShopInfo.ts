import { useEffect, useState } from "react";
import { getPricing, getShopInfo } from "../api/endpoints";
import type { PublicPricing, ShopInfo } from "../api/types";

/**
 * Contacts, the stall and the price ladder change rarely and appear on many pages (top bar, footer, home, bag), so
 * each is fetched once per visit and shared. A failed fetch leaves the page working without it.
 */
function shared<T>(load: () => Promise<T>) {
  let promise: Promise<T> | null = null;
  return function useShared(): T | null {
    const [value, setValue] = useState<T | null>(null);
    useEffect(() => {
      let alive = true;
      promise ??= load().catch((e) => { promise = null; throw e; });
      promise.then((v) => { if (alive) setValue(v); }).catch(() => { /* shown without it */ });
      return () => { alive = false; };
    }, []);
    return value;
  };
}

export const useShopInfo = shared<ShopInfo>(() => getShopInfo());
export const usePricing = shared<PublicPricing>(() => getPricing());
