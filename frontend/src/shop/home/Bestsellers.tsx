import { useState } from "react";
import { getBestsellers } from "../../api/endpoints";
import type { Category } from "../../api/types";
import { Skeleton } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ProductCard } from "../../components/ProductCard";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";

const SHELVES: Array<Category | null> = [null, "MEN", "WOMEN", "KIDS"];

/**
 * What people buy most, from the shop's own paid orders. When too few have sold yet (a new shop, a quiet shelf) the
 * list is topped up with the newest socks and the heading says "new on the shelf" instead, so nothing is called a
 * bestseller that is not one.
 */
export function Bestsellers() {
  const { t } = useT();
  const [cat, setCat] = useState<Category | null>(null);
  const best = useAsync((signal) => getBestsellers(cat, 8, signal), [cat]);
  const real = (best.data?.sold ?? 0) >= 4;
  return (
    <section className="av-block av-sand" aria-labelledby="best-title" data-reveal>
      <div className="av-container">
        <header className="av-block__head av-block__head--row">
          <div><span className="av-eyebrow">{t(real ? "best2.eyebrow" : "best2.eyebrowNew")}</span><h2 id="best-title">{t(real ? "best2.title" : "best2.titleNew")}</h2></div>
          <div className="av-chips" role="group" aria-label={t("best.filter")}>
            {SHELVES.map((c) => (
              <button key={c ?? "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c ? t(`nav.${c.toLowerCase()}` as MessageKey) : t("height.all")}
              </button>
            ))}
          </div>
        </header>
        {best.loading && !best.data && <div className="av-grid-products">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={360} />)}</div>}
        {best.error && <p className="av-small">{t("best.error")}</p>}
        {best.data && (
          <div className={`av-grid-products av-shelf${best.loading ? " is-loading" : ""}`} key={cat ?? "all"}>
            {best.data.items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={(i % 6) + 1} />)}
          </div>
        )}
        <div className="av-row av-shelf__more"><Button to="/shop" variant="secondary">{t("best.all")}</Button></div>
      </div>
    </section>
  );
}
