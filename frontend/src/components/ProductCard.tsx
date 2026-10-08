import { Link } from "react-router-dom";
import type { ProductSummary } from "../api/types";
import { useT } from "../i18n/I18n";
import { productMeta } from "../lib/labels";
import { Badge } from "./Badge";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";

/**
 * Catalog grid card: photo on a soft tint, colour dots, honest sold-out state. The whole card is one link.
 * tint (1-6) varies the backdrop from card to card, the way Bombas lays out its shelves.
 */
export function ProductCard({ product, to, tint }: { product: ProductSummary; to: string; tint?: number }) {
  const { t } = useT();
  const soldOut = !product.inStock;
  return (
    <Link className={`av-card${soldOut ? " av-card--soldout" : ""}`} to={to}>
      <div className="av-card__media" style={tint ? { background: `var(--tint-${tint})` } : undefined}>
        <ProductImage image={product.image} />
        {soldOut && <span className="av-card__badge"><Badge tone="danger">{t("card.soldOut")}</Badge></span>}
      </div>
      <div className="av-card__meta">
        <span className="av-card__name">{product.name}</span>
        <span className="av-small">{productMeta(product)}</span>
        <span className="av-card__foot">
          <Price amount={product.minPrice} from={product.variantCount > 1} />
          {product.colors.length > 1 && (
            <span className="av-dots" aria-label={t("card.colours", { n: product.colors.length })}>
              {product.colors.map((c) => <span key={c} className="av-dot" style={{ background: c }} />)}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
