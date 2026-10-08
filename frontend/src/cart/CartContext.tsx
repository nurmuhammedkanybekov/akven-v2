import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** What the cart remembers about a line, so it can still be shown (with the prices it was added at) while offline. */
export interface CartLine {
  sku: string;
  quantity: number;
  negotiationSessionId?: string;
  productSlug: string;
  productName: string;
  variantLabel: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  unitPrice: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  add: (line: Omit<CartLine, "quantity">, quantity: number, maxQuantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

const KEY = "akven-cart-v1";
/** The same limit the server applies to one line: enough for a 100-pair collection or a wholesale order. */
export const MAX_PER_LINE = 999;
const CartContext = createContext<CartState | null>(null);

function isLine(x: unknown): x is CartLine {
  const l = x as CartLine;
  return !!l && typeof l.sku === "string" && Number.isInteger(l.quantity) && l.quantity >= 1 && l.quantity <= MAX_PER_LINE
    && typeof l.productName === "string" && typeof l.unitPrice === "number";
}

/** Reads the saved cart; anything damaged or hand-edited is dropped rather than trusted. */
export function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch { return []; }
}
function writeCart(lines: CartLine[]) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage blocked: the cart lives in memory for this visit */ }
}

/**
 * The bag lives in the browser: it needs no account, survives a reload, works offline (NFR-5), and is shared between
 * tabs. It stores which item and how many, plus a display snapshot. Prices are NEVER taken from it: checkout
 * re-prices everything on the server.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readCart);

  const update = useCallback((fn: (current: CartLine[]) => CartLine[]) => {
    setLines((current) => { const next = fn(current); writeCart(next); return next; });
  }, []);

  // Another tab changed the bag: follow it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) setLines(readCart()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback<CartState["add"]>((line, quantity, maxQuantity = MAX_PER_LINE) => {
    update((current) => {
      const cap = Math.min(MAX_PER_LINE, Math.max(1, maxQuantity));
      const existing = current.find((l) => l.sku === line.sku);
      if (existing) return current.map((l) => (l.sku === line.sku ? { ...l, ...line, quantity: Math.min(cap, l.quantity + quantity) } : l));
      return [...current, { ...line, quantity: Math.min(cap, Math.max(1, quantity)) }];
    });
  }, [update]);
  const setQuantity = useCallback((sku: string, quantity: number) => {
    update((current) => quantity < 1 ? current.filter((l) => l.sku !== sku)
      : current.map((l) => (l.sku === sku ? { ...l, quantity: Math.min(MAX_PER_LINE, Math.floor(quantity)) } : l)));
  }, [update]);
  const remove = useCallback((sku: string) => update((current) => current.filter((l) => l.sku !== sku)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo<CartState>(() => ({
    lines, add, setQuantity, remove, clear, count: lines.reduce((n, l) => n + l.quantity, 0),
  }), [lines, add, setQuantity, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
