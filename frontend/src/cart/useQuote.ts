import { useEffect, useMemo, useState } from "react";
import { quoteCart } from "../api/endpoints";
import type { Quote } from "../api/types";
import type { CartLine } from "./CartContext";

interface QuoteState { quote: Quote | null; loading: boolean; offline: boolean }

/**
 * Current prices and availability for the bag, from the server. If the server cannot be reached the bag is still
 * shown from its saved snapshot, flagged as offline, so a shopper on a bad connection never sees an empty page.
 * Re-runs when the bag or the signed-in person changes (negotiated offers only apply to their owner).
 */
export function useQuote(lines: CartLine[], identity: string | null): QuoteState {
  const [state, setState] = useState<QuoteState>({ quote: null, loading: lines.length > 0, offline: false });
  const signature = useMemo(() => JSON.stringify(lines.map((l) => [l.sku, l.quantity, l.negotiationSessionId ?? null])), [lines]);

  useEffect(() => {
    if (lines.length === 0) { setState({ quote: null, loading: false, offline: false }); return; }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    quoteCart(lines.map((l) => ({ sku: l.sku, quantity: l.quantity, negotiationSessionId: l.negotiationSessionId })), controller.signal)
      .then((quote) => { if (!controller.signal.aborted) setState({ quote, loading: false, offline: false }); })
      .catch((e: Error) => { if (e.name !== "AbortError" && !controller.signal.aborted) setState((s) => ({ quote: s.quote, loading: false, offline: true })); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, identity]);

  return state;
}
