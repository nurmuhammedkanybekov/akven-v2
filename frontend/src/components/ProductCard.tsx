import { useState } from "react";
import { Link } from "react-router-dom";
import type { ProductSummary } from "../api/types";
import { useT } from "../i18n/I18n";
import { useMoney } from "../shop/useMoney";
import { useSaved } from "../shop/useSaved";
import { HeartIcon } from "./icons";
import type { MessageKey } from "../i18n/en";
import { productMeta } from "../lib/labels";
import { Badge } from "./Badge";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { QuickView } from "./QuickView";

/**
 * Catalog grid card: photo on a soft tint, colour dots, honest sold-out state. The whole card is one link.
 * tint (1-6) varies the backdrop from card to card, the way Bombas lays out its shelves. "Quick view" opens the
 * sock in a panel to choose and add it without leaving the shelf.
 */
export function ProductCard({ product, to, tint }: { product: ProductSummary; to: string; tint?: number }) {
  const { t } = useT();
  const { money } = useMoney();
  // Packs are compared by the pair: "From $11.00 · $3.67 a pair". Gift boxes are a gift, not a pack, so they are left alone.
  const perPair = product.category !== "BUNDLES" && product.minPairPrice != null && product.minPrice != null
    && product.minPairPrice < product.minPrice - 0.005 ? product.minPairPrice : null;
  const saved = useSaved();
  const soldOut = !product.inStock;
  const isSaved = saved.has(product.slug);
  const [quick, setQuick] = useState(false);
  return (
    <div className="av-card-wrap">
    <Link className={`av-card${soldOut ? " av-card--soldout" : ""}`} to={to}>
      <div className="av-card__media" style={tint ? { background: `var(--tint-${tint})` } : undefined}>
        <ProductImage image={product.image} />
        {product.hoverImage && (
          <img className="av-card__hover" src={product.hoverImage.url} alt="" width={800} height={1000} loading="lazy" decoding="async" />
        )}
        {soldOut && <span className="av-card__badge"><Badge tone="danger">{t("card.soldOut")}</Badge></span>}
      </div>
      <div className="av-card__meta">
        <span className="av-card__name">{product.name}</span>
        <span className="av-small">{productMeta(product, t(`nav.${product.category.toLowerCase()}` as MessageKey))}</span>
        <span className="av-card__foot">
          <span className="av-card__price">
            <Price amount={product.minPrice} from={product.variantCount > 1} />
            {perPair !== null && <span className="av-card__pair">{t("card.perPair", { price: money(perPair) })}</span>}
          </span>
          {product.colors.length > 1 && (
            <span className="av-dots" aria-label={t("card.colours", { n: product.colors.length })}>
              {product.colors.map((c) => <span key={c} className="av-dot" style={{ background: c }} />)}
            </span>
          )}
        </span>
      </div>
    </Link>
    <button type="button" className={`av-save${isSaved ? " is-on" : ""}`} aria-pressed={isSaved}
      aria-label={t(isSaved ? "save.remove" : "save.add", { name: product.name })}
      onClick={() => saved.toggle({ slug: product.slug, name: product.name, image: product.image?.url ?? null, price: product.minPrice })}>
      <HeartIcon />
    </button>
    {!soldOut && (
      <div className="av-quick-layer">
        <button type="button" className="av-quick" onClick={() => setQuick(true)} aria-label={t("qv.open", { name: product.name })}>
          {t("qv.button")}
        </button>
      </div>
    )}
    {quick && <QuickView slug={product.slug} name={product.name} open onClose={() => setQuick(false)} />}
    </div>
  );
}
