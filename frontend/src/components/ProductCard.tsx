import type { ProductSummary } from "../api/types";
import { productMeta } from "../lib/labels";
import { Badge } from "./Badge";
import { Price } from "./Price";

/** Catalog grid card. The image has explicit dimensions so the page never jumps while pictures load. */
export function ProductCard({ product, href }: { product: ProductSummary; href: string }) {
  const soldOut = !product.inStock;
  return (
    <a className={`av-card${soldOut ? " av-card--soldout" : ""}`} href={href}>
      <div className="av-card__media">
        {product.image && <img src={product.image.url} alt={product.image.alt} width={800} height={1000} loading="lazy" decoding="async" />}
        {soldOut && <span className="av-card__badge"><Badge tone="danger">Sold out</Badge></span>}
      </div>
      <div className="av-card__meta">
        <span className="av-eyebrow">{productMeta(product)}</span>
        <span className="av-card__name">{product.name}</span>
        <Price amount={product.minPrice} from={product.variantCount > 1} />
      </div>
    </a>
  );
}
