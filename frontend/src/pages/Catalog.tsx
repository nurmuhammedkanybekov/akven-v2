import { NavLink, useSearchParams } from "react-router-dom";
import { getFacets, listProducts, type CatalogQuery } from "../api/endpoints";
import type { Category, FacetOption } from "../api/types";
import { Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Select } from "../components/Field";
import { Pagination } from "../components/Pagination";
import { ProductCard } from "../components/ProductCard";
import { useAsync } from "../hooks/useAsync";
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_PATH } from "../lib/labels";

const SORTS: Array<[string, string]> = [["newest", "Newest"], ["name", "Name"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"]];

/**
 * The shop window: audience tabs, the owners' own sections and cuts as filter chips with live counts, stock and
 * sort. Every filter lives in the URL, so a filtered view can be bookmarked, shared and reached with Back.
 */
export function CatalogPage({ category }: { category?: Category }) {
  const [params, setParams] = useSearchParams();
  const section = params.get("section") ?? undefined;
  const cut = params.get("cut") ?? undefined;
  const sort = params.get("sort") ?? "newest";
  const inStock = params.get("inStock") === "1";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);

  const query: CatalogQuery = { category, section, cut, inStock, sort, page, pageSize: 12 };
  const products = useAsync((signal) => listProducts(query, signal), [JSON.stringify(query)]);
  const facetQuery = { category, section, cut, inStock };
  const facets = useAsync((signal) => getFacets(facetQuery, signal), [JSON.stringify(facetQuery)]);

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: false });
  }
  const toggle = (key: "section" | "cut", slug: string, current?: string) => set(key, current === slug ? null : slug);
  const anyFilter = Boolean(section || cut || inStock);
  const total = products.data?.totalItems;

  const options = (key: "section" | "cut", list: FacetOption[] | undefined, current?: string) =>
    list && list.length > 0 && (
      <div className="av-filter-group" role="group" aria-label={key === "section" ? "Sections" : "Cuts"}>
        <span className="av-eyebrow">{key === "section" ? "Section" : "Cut"}</span>
        <div className="av-row">
          {list.map((o) => <Chip key={o.slug} label={o.name} count={o.count} pressed={current === o.slug} onToggle={() => toggle(key, o.slug, current)} />)}
        </div>
      </div>
    );

  return (
    <div className="av-container av-page">
      <header className="av-page__head">
        <span className="av-eyebrow">{category ? "Shop" : "Shop"}</span>
        <h1>{category ? CATEGORY_LABEL[category] : "All socks"}</h1>
        {total !== undefined && <p className="av-small" aria-live="polite">{total} {total === 1 ? "product" : "products"}</p>}
      </header>

      <nav className="av-tabs" aria-label="Audience">
        <NavLink to="/shop" end>All{facets.data ? <span className="av-chip__count"> {Object.values(facets.data.category).reduce((a, b) => a + b, 0)}</span> : null}</NavLink>
        {CATEGORIES.map((c) => (
          <NavLink key={c} to={CATEGORY_PATH[c]}>{CATEGORY_LABEL[c]}{facets.data ? <span className="av-chip__count"> {facets.data.category[c]}</span> : null}</NavLink>
        ))}
      </nav>

      <div className="av-filters">
        {options("section", facets.data?.section, section)}
        {options("cut", facets.data?.cut, cut)}
        <div className="av-filters__row">
          <Chip label="In stock only" pressed={inStock} onToggle={() => set("inStock", inStock ? null : "1")} />
          <div className="av-filters__sort">
            <Select label="Sort by" value={sort} onChange={(e) => set("sort", e.target.value === "newest" ? null : e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          {anyFilter && <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>}
        </div>
      </div>

      {products.loading && !products.data && <div className="av-grid-products">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} height={360} />)}</div>}
      {products.error && <p className="av-lead">We could not load the catalog. Please try again in a moment.</p>}
      {products.data && products.data.items.length === 0 && (
        <div className="av-empty">
          <h2>Nothing matches yet</h2>
          <p className="av-lead">{anyFilter ? "Try removing a filter." : "New socks are on their way."}</p>
          {anyFilter && <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>}
        </div>
      )}
      {products.data && products.data.items.length > 0 && (
        <div className="av-grid-products" style={{ opacity: products.loading ? 0.6 : 1 }}>
          {products.data.items.map((p) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} />)}
        </div>
      )}
      {products.data && <Pagination page={products.data.page} totalPages={products.data.totalPages} onPage={(p) => set("page", p === 0 ? null : String(p))} />}
    </div>
  );
}
