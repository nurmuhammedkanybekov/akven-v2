import { Bestsellers } from "../shop/home/Bestsellers";
import { CategoryTiles } from "../shop/home/CategoryTiles";
import { DordoiStory } from "../shop/home/DordoiStory";
import { LadderStrip } from "../shop/home/LadderStrip";
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
 * The home page, in the order people shop: the socks on the first screen, plain facts, the four shelves, what people
 * buy most and the collection price beside it, the fitting room for those still choosing, what other families say,
 * the knit up close. Then gifts and the family set, and only then who is behind it (two names, the stall at Dordoi,
 * notes from the counter), with wholesale last for the shops that come looking for it.
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
      <Bestsellers />
      <LadderStrip />
      <FittingSection />
      <FamiliesSay />
      <UpClose />
      <GiftTeaser />
      <FamilyPlanner minPairs={min} tiers={tiers} />
      <TwoNames />
      <DordoiStory />
      <StallNotes />
      <ForBusiness />
    </>
  );
}
