import { listProducts } from "../api/endpoints";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { ProductCard } from "../components/ProductCard";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import { useT } from "../i18n/I18n";
import { BoxBuilder } from "../shop/home/BoxBuilder";
import { GiftCalendar } from "../shop/home/GiftCalendar";
import { GiftTeaser } from "../shop/home/GiftTeaser";
import { usePricing } from "../shop/useShopInfo";

/**
 * Gift sets: the ready-made boxes from the catalogue, a box of your own (built and written here, packed at the stall),
 * the days people give socks in Kyrgyzstan, and the collection box that shows how the price falls with every pair.
 */
export function GiftSetsPage() {
  const { t } = useT();
  usePageTitle(t("nav.gifts"));
  const pricing = usePricing();
  const sets = useAsync((signal) => listProducts({ category: "BUNDLES", pageSize: 12, sort: "newest" }, signal), []);
  return (
    <>
      <div className="av-container av-page av-giftsets">
        <header className="av-page__head">
          <span className="av-eyebrow">{t("nav.gifts")}</span>
          <h1>{t("gifts.title")}</h1>
          <p className="av-lead">{t("gifts.lead")}</p>
        </header>
        {sets.loading && !sets.data ? <div className="av-grid-products">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={360} />)}</div> : (
          <div className="av-grid-products">
            {(sets.data?.items ?? []).map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={((i + 2) % 6) + 1} />)}
          </div>
        )}
        <div className="av-row av-shelf__more"><Button to="/bundles" variant="secondary">{t("gift.all")}</Button></div>
      </div>
      <GiftTeaser />
      <GiftCalendar />
      <BoxBuilder minPairs={pricing?.minOrderPairs ?? 1} tiers={pricing?.tiers ?? []} />
    </>
  );
}
