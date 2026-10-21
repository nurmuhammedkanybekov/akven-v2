import { Bestsellers } from "../shop/home/Bestsellers";
import { CategoryTiles } from "../shop/home/CategoryTiles";
import { DordoiStory } from "../shop/home/DordoiStory";
import { FittingSection } from "../shop/home/FittingSection";
import { FamilyPlanner } from "../shop/home/FamilyPlanner";
import { ForBusiness } from "../shop/home/ForBusiness";
import { GiftTeaser } from "../shop/home/GiftTeaser";
import { HeroEditorial } from "../shop/home/HeroEditorial";
import { TrustStrip } from "../shop/home/TrustStrip";
import { TwoNames } from "../shop/home/TwoNames";
import { StallNotes } from "../shop/home/StallNotes";
import { FamiliesSay } from "../shop/home/FamiliesSay";
import { ForYou } from "../shop/home/ForYou";
import { UpClose } from "../shop/home/UpClose";
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
      <ForYou />
      <CategoryTiles />
      <FittingSection />
      <Bestsellers />
      <UpClose />
      <TwoNames />
      <DordoiStory />
      <FamilyPlanner minPairs={min} tiers={tiers} />
      <FamiliesSay />
      <StallNotes />
      <GiftTeaser />
      <ForBusiness />
    </>
  );
}
