import { useState } from "react";
import { listProducts } from "../../api/endpoints";
import type { Category } from "../../api/types";
import { Skeleton } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ProductCard } from "../../components/ProductCard";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { CATEGORIES } from "../../lib/labels";

/**
 * The shelf: the newest socks, switchable between audiences without leaving the page. The switch is a set of toggle
 * buttons (aria-pressed); the grid below is one live list.
 */
export function Shelf() {
  const { t } = useT();
  const [cat, setCat] = useState<Category | null>(null);
  const shelf = useAsync((signal) => listProducts({ pageSize: 8, sort: "newest", inStock: true, category: cat ?? undefined }, signal), [cat]);

  return (
    <section className="av-block" aria-labelledby="best-title">
      <div className="av-container">
        <header className="av-block__head av-block__head--row">
          <div><span className="av-eyebrow av-orn">{t("best.eyebrow")}</span><h2 id="best-title">{t("best.title")}</h2></div>
          <div className="av-chips" role="group" aria-label={t("best.filter")}>
            <button type="button" aria-pressed={cat === null} onClick={() => setCat(null)}>{t("height.all")}</button>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{t(`nav.${c.toLowerCase()}` as MessageKey)}</button>
            ))}
          </div>
        </header>
        {shelf.loading && !shelf.data && <div className="av-grid-products">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={360} />)}</div>}
        {shelf.error && <p className="av-small">{t("best.error")}</p>}
        {shelf.data && shelf.data.items.length === 0 && <p className="av-lead">{t("best.empty")}</p>}
        {shelf.data && shelf.data.items.length > 0 && (
          <div className={`av-grid-products av-shelf${shelf.loading ? " is-loading" : ""}`} key={cat ?? "all"}>
            {shelf.data.items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={(i % 6) + 1} />)}
          </div>
        )}
        <div className="av-row av-shelf__more"><Button to="/shop" variant="secondary">{t("best.all")}</Button></div>
      </div>
    </section>
  );
}
