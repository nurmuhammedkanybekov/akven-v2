import { Bestsellers } from "../shop/home/Bestsellers";
import { CategoryTiles } from "../shop/home/CategoryTiles";
import { DordoiStory } from "../shop/home/DordoiStory";
import { LadderStrip } from "../shop/home/LadderStrip";
import { FittingTeaser } from "../shop/home/FittingTeaser";
import { ForBusiness } from "../shop/home/ForBusiness";
import { HeroEditorial } from "../shop/home/HeroEditorial";
import { HomeDuo } from "../shop/home/HomeDuo";
import { TrustStrip } from "../shop/home/TrustStrip";
import { TwoNames } from "../shop/home/TwoNames";
import { StallNotes } from "../shop/home/StallNotes";
import { FamiliesSay } from "../shop/home/FamiliesSay";
import { ForYou } from "../shop/home/ForYou";
import { HornBand } from "../brand/Ornaments";

/**
 * The home page, in the order people shop: the socks on the first screen, plain facts, the shelves, what is new and
 * the collection price beside it, a taste of the fitting room for those still choosing, what other families say, then
 * gifts and the family set. Only then who is behind it (two names, the stall at Dordoi, notes from the counter), with
 * wholesale last. The full fitting room (/fitting), the family planner (/family) and the knit up close (/story) have
 * pages of their own, each a tap away from here.
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
      <FittingTeaser />
      <FamiliesSay />
      <HomeDuo />
      <div className="av-hornsep" data-reveal><HornBand count={5} /></div>
      <TwoNames />
      <DordoiStory short />
      <StallNotes />
      <ForBusiness />
    </>
  );
}
