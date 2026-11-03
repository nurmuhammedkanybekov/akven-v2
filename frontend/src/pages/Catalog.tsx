import { Fragment } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { getFacets, listProducts, type CatalogQuery } from "../api/endpoints";
import type { Category, FacetOption, PageResponse, ProductSummary } from "../api/types";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Clothesline } from "../components/Clothesline";
import { HeightIcon, isCut } from "../shop/fitting/HeightIcon";
import { Chip } from "../components/Chip";
import { CloseIcon } from "../components/icons";
import { ProductCard } from "../components/ProductCard";
import { RecentlyViewed } from "../shop/RecentlyViewed";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { CATEGORIES, CATEGORY_PATH } from "../lib/labels";
import { usePricing } from "../shop/useShopInfo";

const SORTS: Array<[string, MessageKey]> = [["newest", "shop.sortNew"], ["name", "shop.sortName"], ["price_asc", "shop.sortLow"], ["price_desc", "shop.sortHigh"]];
const PAGE = 12;
/** At most this many pages are shown at once (12 × 8 = 96 socks); the URL keeps how many. */
const MAX_PAGES = 8;

type Shelf = Category | "ALL";

/** Each shelf's fabric and the socks on its washing line. */
const FABRIC: Record<Shelf, string> = { ALL: "knit", MEN: "knit", WOMEN: "rib", KIDS: "dots", BUNDLES: "paper" };
const BANNER: Record<Shelf, SockSpec[]> = {
  ALL: [
    { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "mid-long", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
    { cut: "mid-long", main: C.pink, accent: C.red, pattern: "hearts" },
  ],
  MEN: [
    { cut: "crew", main: C.navy, accent: C.navy, pattern: "rib", heel: false },
    { cut: "mid-long", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "mid-long", main: C.black, accent: C.mustard, pattern: "compression" },
  ],
  WOMEN: [
    { cut: "crew", main: C.white, accent: C.rose, lace: true, second: "#ffffff" },
    { cut: "mid-long", main: C.cream, accent: C.navy, pattern: "oimo", second: C.gold },
    { cut: "mid-long", main: C.pink, accent: C.red, pattern: "hearts" },
  ],
  KIDS: [
    { cut: "crew", main: C.beige, accent: C.brown, pattern: "bear", second: C.cream },
    { cut: "mid-long", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
    { cut: "mid-long", main: C.navy, accent: C.white, pattern: "stripes", heel: false },
  ],
  BUNDLES: [
    { cut: "crew", main: C.red, accent: C.white, pattern: "snow" },
    { cut: "mid-long", main: C.cream, accent: C.brick, pattern: "oimo", second: C.gold },
    { cut: "crew", main: C.black, accent: C.gold, pattern: "sparkle", second: "#ffffff" },
  ],
};

/** A drawn sock for each of the owners' sections, so an occasion reads at a glance; others get a plain crew. */
const OCCASION: Record<string, SockSpec> = {
  classic: { cut: "crew", main: C.navy, accent: C.navy, pattern: "rib", heel: false },
  casual: { cut: "crew", main: C.sky, accent: C.mustard, pattern: "multistripe", second: C.coral },
  sport: { cut: "crew", main: C.white, accent: C.navy, pattern: "stripes" },
  thermal: { cut: "crew", main: C.oat, accent: C.beige, fluffy: true },
  home: { cut: "crew", main: C.lilac, accent: C.white, fluffy: true, grip: true },
  heritage: { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.gold },
};
const PLAIN: SockSpec = { cut: "crew", main: C.charcoal, accent: C.grey, pattern: "rib" };

/** Every page up to `upTo`, joined into one list ("Show 12 more" adds the next). */
async function loadUpTo(query: CatalogQuery, upTo: number, signal: AbortSignal): Promise<PageResponse<ProductSummary>> {
  const pages = await Promise.all(Array.from({ length: upTo + 1 }, (_, p) => listProducts({ ...query, page: p }, signal)));
  const last = pages[pages.length - 1];
  return { ...last, items: pages.flatMap((p) => p.items) };
}

/**
 * The shop window. Each shelf (all, men, women, children, gift boxes) opens on its own fabric with its socks on the
 * washing line; the owners' sections are drawn as occasions; heights, sizes and colours are filters with live counts;
 * every choice can be taken off as a tag. Everything lives in the URL, so a view can be bookmarked, shared and reached
 * with Back. The list grows twelve at a time.
 */
export function CatalogPage({ category }: { category?: Category }) {
  const { t } = useT();
  const pricing = usePricing();
  const firstStep = [...(pricing?.tiers ?? [])].sort((a, b) => a.minPairs - b.minPairs)[0];
  const key: Shelf = category ?? "ALL";
  const [params, setParams] = useSearchParams();
  const section = params.get("section") ?? undefined;
  const cut = params.get("cut") ?? undefined;
  const size = params.get("size") ?? undefined;
  const color = params.get("color") ?? undefined;
  const sort = params.get("sort") ?? "newest";
  const inStock = params.get("inStock") === "1";
  const upTo = Math.min(MAX_PAGES - 1, Math.max(0, Number(params.get("page") ?? 0) || 0));
  const q = (params.get("q") ?? "").trim().slice(0, 80) || undefined;

  const query: CatalogQuery = { category, section, cut, size, color, q, inStock, sort, pageSize: PAGE };
  const products = useAsync((signal) => loadUpTo(query, upTo, signal), [JSON.stringify(query), upTo]);
  const facetQuery = { category, section, cut, size, color, q, inStock };
  const facets = useAsync((signal) => getFacets(facetQuery, signal), [JSON.stringify(facetQuery)]);

  function set(name: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next, { replace: name === "page", preventScrollReset: true });
  }
  const toggle = (name: string, value: string, current?: string) => set(name, current?.toLowerCase() === value.toLowerCase() ? null : value);
  const anyFilter = Boolean(section || cut || size || color || inStock || q);
  const total = products.data?.totalItems;
  const shown = products.data?.items.length ?? 0;
  const more = products.data ? products.data.page + 1 < products.data.totalPages && upTo + 1 < MAX_PAGES : false;

  const names = (list: FacetOption[] | undefined, slug?: string) => list?.find((o) => o.slug === slug)?.name ?? slug;
  const active: Array<{ name: string; label: string }> = [
    section && { name: "section", label: names(facets.data?.section, section)! },
    cut && { name: "cut", label: names(facets.data?.cut, cut)! },
    size && { name: "size", label: t("shop.sizeIs", { size }) },
    color && { name: "color", label: facets.data?.color?.find((c) => c.name.toLowerCase() === color.toLowerCase())?.name ?? color },
    inStock && { name: "inStock", label: t("shop.inStock") },
    q && { name: "q", label: `“${q}”` },
  ].filter(Boolean) as Array<{ name: string; label: string }>;

  return (
    <>
    <section className={`av-shelfhead av-fabric--${FABRIC[key]}`} aria-labelledby="shop-title">
      <div className="av-container av-shelfhead__inner">
        <div className="av-shelfhead__copy">
          <span className="av-hand">{t("shop.eyebrow")}</span>
          <h1 id="shop-title">{t(`shop.title.${key}` as MessageKey)}</h1>
          <p className="av-shelfhead__lead">{t(`shop.lead.${key}` as MessageKey)}</p>
          {q && (
            <p className="av-searchfor">
              <span>{t("search.resultsFor", { q })}</span>
              <button type="button" className="av-linkbtn" onClick={() => set("q", null)}>{t("search.clear")}</button>
            </p>
          )}
          <div className="av-row">
            {total !== undefined && <span className="av-kraft" aria-live="polite">{t(total === 1 ? "shop.count1" : "shop.count", { n: total })}</span>}
            <Link className="av-shelfhead__finder" to="/finder">{t("fd.cta")} →</Link>
          </div>
        </div>
        <div className="av-shelfhead__line av-swing-on" aria-hidden="true">
          <Clothesline socks={BANNER[key]} at={[0.08, 0.38, 0.68]} width={0.3} sag={0.05} />
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

      {facets.data && facets.data.section.length > 0 && (
        <div className="av-occasions" role="group" aria-label={t("shop.sections")}>
          {facets.data.section.map((o, i) => {
            const on = section === o.slug;
            return (
              <button key={o.slug} type="button" className="av-occasion av-swing-on" aria-pressed={on} disabled={o.count === 0 && !on}
                onClick={() => toggle("section", o.slug, section)} style={{ "--i": i } as React.CSSProperties}>
                <span className="av-occasion__pic" aria-hidden="true"><span className="av-cl__swing"><SockArt {...(OCCASION[o.slug] ?? PLAIN)} /></span></span>
                <span className="av-occasion__name">{o.name}</span>
                <span className="av-occasion__count">{o.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="av-shelfbar" role="group" aria-label={t("shop.filters")}>
        {facets.data && facets.data.cut.length > 0 && (
          <div className="av-shelfbar__group" role="group" aria-label={t("shop.cuts")}>
            {facets.data.cut.map((o) => <Chip key={o.slug} label={o.name} count={o.count} pressed={cut === o.slug} onToggle={() => toggle("cut", o.slug, cut)}
              icon={isCut(o.slug) ? <HeightIcon cut={o.slug} /> : undefined} />)}
          </div>
        )}
        {facets.data?.size && facets.data.size.length > 1 && (
          <div className="av-shelfbar__group" role="group" aria-label={t("shop.sizes")}>
            <span className="av-shelfbar__label">{t("shop.size")}</span>
            {facets.data.size.map((o) => (
              <button key={o.slug} type="button" className="av-sizechip" aria-pressed={size?.toLowerCase() === o.slug.toLowerCase()}
                disabled={o.count === 0} onClick={() => toggle("size", o.slug, size)} title={t("shop.countN", { n: o.count })}>{o.name}</button>
            ))}
          </div>
        )}
        {facets.data?.color && facets.data.color.length > 1 && (
          <div className="av-shelfbar__group av-swatches" role="group" aria-label={t("shop.colours")}>
            {facets.data.color.map((o) => {
              const on = color?.toLowerCase() === o.name.toLowerCase();
              return (
                <button key={o.name} type="button" className="av-swatch" aria-pressed={on} onClick={() => toggle("color", o.name, color)}
                  aria-label={`${o.name}, ${t("shop.countN", { n: o.count })}`} title={`${o.name} · ${o.count}`}
                  style={{ "--sw": o.hex ?? "#ccc" } as React.CSSProperties} />
              );
            })}
          </div>
        )}
        <div className="av-shelfbar__end">
          <Chip label={t("shop.inStock")} pressed={inStock} onToggle={() => set("inStock", inStock ? null : "1")} />
          <label className="av-shelfbar__sort">
            <span className="av-visually-hidden">{t("shop.sort")}</span>
            <select className="av-select" value={sort} onChange={(e) => set("sort", e.target.value === "newest" ? null : e.target.value)} aria-label={t("shop.sort")}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {active.length > 0 && (
        <div className="av-activefilters" aria-label={t("shop.chosen")}>
          {active.map((a) => (
            <button key={a.name} type="button" className="av-activetag" onClick={() => set(a.name, null)} aria-label={t("shop.remove", { what: a.label })}>
              {a.label} <CloseIcon />
            </button>
          ))}
          <button type="button" className="av-linkbtn" onClick={() => setParams(new URLSearchParams())}>{t("shop.clear")}</button>
        </div>
      )}

      {products.loading && !products.data && <div className="av-grid-products">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} height={360} />)}</div>}
      {products.error && <p className="av-lead">{t("shop.error")}</p>}
      {products.data && products.data.items.length === 0 && (
        <div className="av-empty av-shelfempty">
          <div className="av-shelfempty__line" aria-hidden="true"><Clothesline socks={[]} /></div>
          <h2>{t("shop.none")}</h2>
          <p className="av-lead">{anyFilter ? t("shop.noneFilter") : t("best.empty")}</p>
          {anyFilter && <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>{t("shop.clear")}</Button>}
        </div>
      )}
      {products.data && products.data.items.length > 0 && (
        <div className="av-grid-products" aria-busy={products.loading}>
          {products.data.items.map((p, i) => (
            <Fragment key={p.slug}>
              {i === 4 && firstStep && !anyFilter && (
                <Link to="/family" className="av-promo">
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
      {products.data && total !== undefined && total > 0 && (
        <div className="av-showmore">
          <p className="av-small">{t("shop.shown", { shown, total })}</p>
          <span className="av-showmore__yarn" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, shown / total)})` }} /></span>
          {more && <Button variant="secondary" loading={products.loading} onClick={() => set("page", String(upTo + 1))}>{t("shop.more", { n: Math.min(PAGE, total - shown) })}</Button>}
        </div>
      )}

      <RecentlyViewed />
    </div>
    </>
  );
}
