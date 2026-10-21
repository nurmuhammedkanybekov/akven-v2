import { Fragment } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { getFacets, listProducts, type CatalogQuery } from "../api/endpoints";
import type { Category, FacetOption } from "../api/types";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { HeightIcon, isCut } from "../shop/fitting/HeightIcon";
import { Chip } from "../components/Chip";
import { Select } from "../components/Field";
import { Pagination } from "../components/Pagination";
import { ProductCard } from "../components/ProductCard";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { CATEGORIES, CATEGORY_PATH } from "../lib/labels";
import { usePricing } from "../shop/useShopInfo";

const SORTS: Array<[string, MessageKey]> = [["newest", "shop.sortNew"], ["name", "shop.sortName"], ["price_asc", "shop.sortLow"], ["price_desc", "shop.sortHigh"]];

/** The socks drawn in each banner: what that shelf is about at a glance. */
const BANNER: Record<Category | "ALL", SockSpec[]> = {
  ALL: [
    { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
    { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  ],
  MEN: [
    { cut: "crew", main: C.navy, accent: C.navy, pattern: "rib", heel: false },
    { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "mid-long", main: C.black, accent: C.mustard, pattern: "compression" },
  ],
  WOMEN: [
    { cut: "ankle", main: C.white, accent: C.rose, lace: true, second: "#ffffff" },
    { cut: "crew", main: C.pink, accent: C.red, pattern: "hearts" },
    { cut: "knee-high", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
  ],
  KIDS: [
    { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream },
    { cut: "ankle", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
    { cut: "knee-high", main: C.navy, accent: C.white, pattern: "stripes", heel: false },
  ],
  BUNDLES: [
    { cut: "crew", main: C.red, accent: C.white, pattern: "snow" },
    { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.gold },
    { cut: "ankle", main: C.black, accent: C.gold, pattern: "sparkle", second: "#ffffff" },
  ],
};

/**
 * The shop window: audience tabs, the owners' own sections and cuts as filter chips with live counts, stock and
 * sort. Every filter lives in the URL, so a filtered view can be bookmarked, shared and reached with Back.
 */
export function CatalogPage({ category }: { category?: Category }) {
  const { t } = useT();
  const pricing = usePricing();
  const firstStep = [...(pricing?.tiers ?? [])].sort((a, b) => a.minPairs - b.minPairs)[0];
  const key = category ?? "ALL";
  const [params, setParams] = useSearchParams();
  const section = params.get("section") ?? undefined;
  const cut = params.get("cut") ?? undefined;
  const sort = params.get("sort") ?? "newest";
  const inStock = params.get("inStock") === "1";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const q = (params.get("q") ?? "").trim().slice(0, 80) || undefined;

  const query: CatalogQuery = { category, section, cut, q, inStock, sort, page, pageSize: 12 };
  const products = useAsync((signal) => listProducts(query, signal), [JSON.stringify(query)]);
  const facetQuery = { category, section, cut, q, inStock };
  const facets = useAsync((signal) => getFacets(facetQuery, signal), [JSON.stringify(facetQuery)]);

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: false });
  }
  const toggle = (key: "section" | "cut", slug: string, current?: string) => set(key, current === slug ? null : slug);
  const anyFilter = Boolean(section || cut || inStock || q);
  const total = products.data?.totalItems;

  const options = (key: "section" | "cut", list: FacetOption[] | undefined, current?: string) =>
    list && list.length > 0 && (
      <div className="av-filter-group" role="group" aria-label={key === "section" ? t("shop.sections") : t("shop.cuts")}>
        <span className="av-eyebrow">{key === "section" ? t("shop.section") : t("shop.cut")}</span>
        <div className="av-row">
          {list.map((o) => <Chip key={o.slug} label={o.name} count={o.count} pressed={current === o.slug} onToggle={() => toggle(key, o.slug, current)}
            icon={key === "cut" && isCut(o.slug) ? <HeightIcon cut={o.slug} /> : undefined} />)}
        </div>
      </div>
    );

  return (
    <>
    <section className={`av-shophead av-shophead--${key.toLowerCase()}`} aria-labelledby="shop-title">
      <div className="av-container av-shophead__inner">
        <div className="av-stack">
          <span className="av-eyebrow">{t("shop.eyebrow")}</span>
          <h1 id="shop-title">{t(`shop.title.${key}` as MessageKey)}</h1>
          <p className="av-shophead__lead">{t(`shop.lead.${key}` as MessageKey)}</p>
          {total !== undefined && <p className="av-small" aria-live="polite">{t(total === 1 ? "shop.count1" : "shop.count", { n: total })}</p>}
          {q && (
            <p className="av-searchfor">
              <span>{t("search.resultsFor", { q })}</span>
              <button type="button" className="av-linkbtn" onClick={() => set("q", null)}>{t("search.clear")}</button>
            </p>
          )}
          <p className="av-small"><Link to="/finder">{t("fd.cta")}</Link></p>
        </div>
        <div className="av-shophead__art" aria-hidden="true">
          {BANNER[key].map((sp, i) => <SockArt key={i} {...sp} style={{ "--k": i } as React.CSSProperties} />)}
        </div>
      </div>
    </section>
    <div className="av-container av-page av-page--shop">
      <nav className="av-tabs" aria-label={t("shop.audience")}>
        <NavLink to="/shop" end>{t("height.all")}{facets.data ? <span className="av-chip__count"> {Object.values(facets.data.category).reduce((a, b) => a + b, 0)}</span> : null}</NavLink>
        {CATEGORIES.map((c) => (
          <NavLink key={c} to={CATEGORY_PATH[c]}>{t(`nav.${c.toLowerCase()}` as MessageKey)}{facets.data ? <span className="av-chip__count"> {facets.data.category[c]}</span> : null}</NavLink>
        ))}
      </nav>

      <div className="av-filters">
        {options("section", facets.data?.section, section)}
        {options("cut", facets.data?.cut, cut)}
        <div className="av-filters__row">
          <Chip label={t("shop.inStock")} pressed={inStock} onToggle={() => set("inStock", inStock ? null : "1")} />
          <div className="av-filters__sort">
            <Select label={t("shop.sort")} value={sort} onChange={(e) => set("sort", e.target.value === "newest" ? null : e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
            </Select>
          </div>
          {anyFilter && <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams())}>{t("shop.clear")}</Button>}
        </div>
      </div>

      {products.loading && !products.data && <div className="av-grid-products">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} height={360} />)}</div>}
      {products.error && <p className="av-lead">{t("shop.error")}</p>}
      {products.data && products.data.items.length === 0 && (
        <div className="av-empty">
          <h2>{t("shop.none")}</h2>
          <p className="av-lead">{anyFilter ? t("shop.noneFilter") : t("best.empty")}</p>
          {anyFilter && <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>{t("shop.clear")}</Button>}
        </div>
      )}
      {products.data && products.data.items.length > 0 && (
        <div className="av-grid-products" style={{ opacity: products.loading ? 0.6 : 1 }}>
          {products.data.items.map((p, i) => (
            <Fragment key={p.slug}>
              {i === 4 && page === 0 && firstStep && (
                <Link to="/#family" className="av-promo">
                  <span className="av-eyebrow">{t("ladder.eyebrow")}</span>
                  <strong>{t("shop.promo", { n: firstStep.minPairs, pct: Number(firstStep.discountPct) })}</strong>
                  <span>{t("shop.promoS")}</span>
                  <span className="av-promo__go">{t("paths.familyGo")} →</span>
                </Link>
              )}
              <ProductCard product={p} to={`/products/${p.slug}`} tint={(i % 6) + 1} />
            </Fragment>
          ))}
        </div>
      )}
      {products.data && <Pagination page={products.data.page} totalPages={products.data.totalPages} onPage={(p) => set("page", p === 0 ? null : String(p))} />}
    </div>
    </>
  );
}
