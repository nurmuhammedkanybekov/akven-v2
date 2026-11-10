import { Bestsellers } from "../shop/home/Bestsellers";
import { CategoryTiles } from "../shop/home/CategoryTiles";
import { DordoiStory } from "../shop/home/DordoiStory";
import { LadderStrip } from "../shop/home/LadderStrip";
import { ForBusiness } from "../shop/home/ForBusiness";
import { HeroEditorial } from "../shop/home/HeroEditorial";
import { TrustStrip } from "../shop/home/TrustStrip";
import { TwoNames } from "../shop/home/TwoNames";
import { FamiliesSay } from "../shop/home/FamiliesSay";
import { ForYou } from "../shop/home/ForYou";

/**
 * The home page, short and in the order people shop: the socks on the first screen, plain facts, the shelves, what
 * sells and the collection price beside it, what other families say; then who is behind it (two names, the stall at
 * Dordoi) and wholesale last. The fitting room (/fitting and /sizes), gift boxes (/gifts), the family planner
 * (/family) and the notes from the counter (/visit) have pages of their own, each a tap away from the menu.
 */
export function HomePage() {
  return (
    <>
      <HeroEditorial />
      <TrustStrip />
      <ForYou />
      <CategoryTiles />
      <Bestsellers />
      <LadderStrip />
      <FamiliesSay />
      <TwoNames />
      <DordoiStory short />
      <ForBusiness />
    </>
  );
}
