import { Link } from "react-router-dom";
import type { ProductSummary } from "../api/types";
import { productMeta } from "../lib/labels";
import { Badge } from "./Badge";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";

/** Catalog grid card: photo, colour dots, honest sold-out state. The whole card is one link. */
export function ProductCard({ product, to }: { product: ProductSummary; to: string }) {
  const soldOut = !product.inStock;
  return (
    <Link className={`av-card${soldOut ? " av-card--soldout" : ""}`} to={to}>
      <div className="av-card__media">
        <ProductImage image={product.image} />
        {soldOut && <span className="av-card__badge"><Badge tone="danger">Sold out</Badge></span>}
      </div>
      <div className="av-card__meta">
        <span className="av-eyebrow">{productMeta(product)}</span>
        <span className="av-card__name">{product.name}</span>
        <span className="av-card__foot">
          <Price amount={product.minPrice} from={product.variantCount > 1} />
          {product.colors.length > 1 && (
            <span className="av-dots" aria-label={`${product.colors.length} colours`}>
              {product.colors.map((c) => <span key={c} className="av-dot" style={{ background: c }} />)}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
