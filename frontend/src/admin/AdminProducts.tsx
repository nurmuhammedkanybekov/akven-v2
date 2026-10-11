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
import { CATEGORY_KEY } from "../lib/labels";
import { formatPrice } from "../lib/format";
import { useT, type Translate } from "../i18n/I18n";

const STATUSES = [["active", "a.status.inShop"], ["retired", "a.status.removed"], ["all", "a.all"]] as const;

function priceRange(p: AdminProduct, t: Translate): string {
  const prices = p.variants.filter((v) => v.active).map((v) => v.price);
  if (!prices.length) return t("a.products.noPrices");
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? formatPrice(min) : t("a.products.priceRange", { min: formatPrice(min), max: formatPrice(max) });
}

export function AdminProducts() {
  const { t } = useT();
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
        <div><span className="av-eyebrow">{t("a.catalog")}</span><h1>{t("a.nav.products")}</h1></div>
        <Button to="/admin/products/new">{t("a.products.add")}</Button>
      </header>

      <div className="av-row av-admin__tools">
        <div className="av-field av-admin__search">
          <label className="av-label" htmlFor="search">{t("a.products.search")}</label>
          <input id="search" className="av-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("a.products.searchEg")} />
        </div>
        <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.show")}>
          {STATUSES.map(([v, l]) => <button key={v} type="button" className="av-tabbtn" aria-pressed={status === v} onClick={() => setParam("status", v === "active" ? null : v)}>{t(l)}</button>)}
        </div>
      </div>

      {list.loading && !list.data && <div className="av-stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} />)}</div>}
      {list.error && <p className="av-error">{list.error.message}</p>}
      {list.data && list.data.items.length === 0 && (
        <div className="av-empty">
          <h2>{urlQ ? t("a.products.noMatch") : status === "retired" ? t("a.products.noneRemoved") : t("a.products.none")}</h2>
          {!urlQ && status === "active" && <><p className="av-lead">{t("a.products.first")}</p><Button to="/admin/products/new">{t("a.products.add")}</Button></>}
        </div>
      )}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <caption className="av-visually-hidden">{t("a.nav.products")}</caption>
            <thead><tr><th scope="col">{t("a.products.product")}</th><th scope="col">{t("a.products.where")}</th><th scope="col">{t("a.products.options")}</th><th scope="col">{t("a.products.prices")}</th><th scope="col">{t("a.status")}</th></tr></thead>
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
                    <td>{t(CATEGORY_KEY[p.category])}<br /><span className="av-small av-muted">{[p.section?.name, p.cut?.name].filter(Boolean).join(" · ") || t("a.products.noSection")}</span></td>
                    <td>{t("a.products.optionCount", { n: active.length })}<br /><span className="av-small av-muted">{t("a.products.inStock", { n: stock })}</span></td>
                    <td className="av-price">{priceRange(p, t)}</td>
                    <td>{p.active ? <Badge tone="success">{t("a.status.inShop")}</Badge> : <Badge tone="danger">{t("a.status.removed")}</Badge>}</td>
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
