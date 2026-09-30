import type { PaymentMethod } from "../api/types";
import { newId } from "./ids";

/**
 * What a wallet sheet hands back: a one-time token, never a card number. The shop's server only ever sees this.
 * In this demo the "wallet" is simulated in the browser; "declined" produces a token the simulated bank refuses,
 * so a failed payment can be shown on demand.
 */
export function newWalletToken(method: PaymentMethod, declined = false): string {
  const prefix = method === "APPLE_PAY" ? "sim_apple_" : "sim_google_";
  const random = newId().replace(/-/g, "").slice(0, 24);
  return `${prefix}${declined ? "declined" : ""}${random}`;
}
