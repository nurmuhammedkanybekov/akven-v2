import type { DeliveryZone } from "../api/types";

/** What delivery costs for socks worth itemsTotal: nothing from the area's free-from amount. The server decides the
 * real fee at checkout; this is the same rule, for showing it beforehand. */
export function deliveryFee(zone: Pick<DeliveryZone, "fee" | "freeFrom">, itemsTotal: number): number {
  return zone.freeFrom != null && itemsTotal >= zone.freeFrom ? 0 : zone.fee;
}

/** How much more to add for free delivery, or null when it is already free or the area has no such amount. */
export function toFreeDelivery(zone: Pick<DeliveryZone, "fee" | "freeFrom">, itemsTotal: number): number | null {
  if (zone.freeFrom == null || zone.fee === 0 || itemsTotal >= zone.freeFrom) return null;
  return Math.round((zone.freeFrom - itemsTotal) * 100) / 100;
}
