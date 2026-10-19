import { Bestsellers } from "../shop/home/Bestsellers";
import { CategoryTiles } from "../shop/home/CategoryTiles";
import { DordoiStory } from "../shop/home/DordoiStory";
import { FamilyPlanner } from "../shop/home/FamilyPlanner";
import { ForBusiness } from "../shop/home/ForBusiness";
import { GiftTeaser } from "../shop/home/GiftTeaser";
import { HeroEditorial } from "../shop/home/HeroEditorial";
import { TrustStrip } from "../shop/home/TrustStrip";
import { TwoNames } from "../shop/home/TwoNames";
import { usePricing } from "../shop/useShopInfo";

/**
 * The home page, products first: the socks on the first screen, five plain facts, the four shelves, what people buy
 * most. Then who is behind it (two names, one family) and where (container 70-E at Dordoi, as a short scene that plays
 * on scroll), and the shop's own tools: a set for the family, a gift box, wholesale.
 */
export function HomePage() {
  const pricing = usePricing();
  const min = pricing?.minOrderPairs ?? 1;
  const tiers = pricing?.tiers ?? [];
  return (
    <>
      <HeroEditorial />
      <TrustStrip />
      <CategoryTiles />
      <Bestsellers />
      <TwoNames />
      <DordoiStory />
      <FamilyPlanner minPairs={min} tiers={tiers} />
      <GiftTeaser />
      <ForBusiness />
    </>
  );
}
