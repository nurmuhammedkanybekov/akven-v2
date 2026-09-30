import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminListProducts } from "../api/endpoints";
import type { AdminProduct } from "../api/types";
import { Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Pagination } from "../components/Pagination";
import { ProductImage } from "../components/ProductImage";
import { useAsync } from "../hooks/useAsync";
import { CATEGORY_LABEL } from "../lib/labels";
import { formatPrice } from "../lib/format";

const STATUSES: Array<[string, string]> = [["active", "In the shop"], ["retired", "Removed"], ["all", "All"]];

function priceRange(p: AdminProduct): string {
  const prices = p.variants.filter((v) => v.active).map((v) => v.price);
  if (!prices.length) return "No prices yet";
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)} to ${formatPrice(max)}`;
}

export function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "active";
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  // Typing searches after a short pause instead of on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (q !== urlQ) { const next = new URLSearchParams(params); q ? next.set("q", q) : next.delete("q"); next.delete("page"); setParams(next, { replace: true }); }
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useAsync(() => adminListProducts({ q: urlQ, status, page, pageSize: 20 }), [urlQ, status, page]);
  const setParam = (k: string, v: string | null) => { const next = new URLSearchParams(params); v ? next.set(k, v) : next.delete(k); if (k !== "page") next.delete("page"); setParams(next); };

  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">Catalog</span><h1>Products</h1></div>
        <Button to="/admin/products/new">Add a product</Button>
      </header>

      <div className="av-row av-admin__tools">
        <div className="av-field av-admin__search">
          <label className="av-label" htmlFor="search">Search by name</label>
          <input id="search" className="av-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Mid-Long" />
        </div>
        <div className="av-tabs av-tabs--inline" role="group" aria-label="Show">
          {STATUSES.map(([v, l]) => <button key={v} type="button" className="av-tabbtn" aria-pressed={status === v} onClick={() => setParam("status", v === "active" ? null : v)}>{l}</button>)}
        </div>
      </div>

      {list.loading && !list.data && <div className="av-stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} />)}</div>}
      {list.error && <p className="av-error">{list.error.message}</p>}
      {list.data && list.data.items.length === 0 && (
        <div className="av-empty">
          <h2>{urlQ ? "No product matches that name" : status === "retired" ? "Nothing has been removed" : "No products yet"}</h2>
          {!urlQ && status === "active" && <><p className="av-lead">Add your first product. Photos can come later.</p><Button to="/admin/products/new">Add a product</Button></>}
        </div>
      )}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <caption className="av-visually-hidden">Products</caption>
            <thead><tr><th scope="col">Product</th><th scope="col">Where it sits</th><th scope="col">Colours and sizes</th><th scope="col">Prices</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {list.data.items.map((p) => {
                const active = p.variants.filter((v) => v.active);
                const stock = active.reduce((n, v) => n + v.availableQty, 0);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/admin/products/${p.id}`} className="av-prodcell">
                        <span className="av-prodcell__img"><ProductImage image={p.images[0] ? { url: p.images[0].url, alt: "" } : null} /></span>
                        <span><strong>{p.name}</strong><br /><span className="av-small av-muted">{p.slug}</span></span>
                      </Link>
                    </td>
                    <td>{CATEGORY_LABEL[p.category]}<br /><span className="av-small av-muted">{[p.section?.name, p.cut?.name].filter(Boolean).join(" · ") || "No section"}</span></td>
                    <td>{active.length} {active.length === 1 ? "option" : "options"}<br /><span className="av-small av-muted">{stock} in stock</span></td>
                    <td className="av-price">{priceRange(p)}</td>
                    <td>{p.active ? <Badge tone="success">In the shop</Badge> : <Badge tone="danger">Removed</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onPage={(p) => setParam("page", p === 0 ? null : String(p))} />}
    </>
  );
}
