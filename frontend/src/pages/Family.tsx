import { FamilyPlanner } from "../shop/home/FamilyPlanner";
import { usePricing } from "../shop/useShopInfo";

/** The family planner on a page of its own: each person, their shoe size and pairs, the sock size and the price step. */
export function FamilyPage() {
  const pricing = usePricing();
  return <FamilyPlanner minPairs={pricing?.minOrderPairs ?? 1} tiers={pricing?.tiers ?? []} page />;
}
