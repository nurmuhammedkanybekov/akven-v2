import { Fragment, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminGetNegotiation, adminListNegotiations } from "../api/endpoints";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Pagination } from "../components/Pagination";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { formatDateTime } from "../lib/format";

/** What the assistant offered next to what the pricing policy allowed, with the whole conversation on request. */
export function AdminNegotiations() {
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const list = useAsync(() => adminListNegotiations({ page, pageSize: 20 }), [page]);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.ng.eyebrow")}</span><h1>{t("a.nav.negotiations")}</h1></div></header>
      <p className="av-lead">{t("a.ng.lead")}</p>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.items.length === 0 && <div className="av-empty"><h2>{t("a.ng.none")}</h2></div>}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <caption className="av-visually-hidden">{t("a.nav.negotiations")}</caption>
            <thead><tr><th scope="col">{t("a.ng.when")}</th><th scope="col">{t("a.orders.customer")}</th><th scope="col">{t("a.ng.item")}</th><th scope="col">{t("a.ng.proposed")}</th><th scope="col">{t("a.ng.validated")}</th><th scope="col"><span className="av-visually-hidden">{t("a.ng.conversation")}</span></th></tr></thead>
            <tbody>
              {list.data.items.map((n) => (
                <Fragment key={n.id}>
                  <tr>
                    <td className="av-small">{formatDateTime(n.createdAt)}</td>
                    <td>{n.customerEmail}</td>
                    <td>{n.productName}<br /><span className="av-small av-muted">{n.sku}</span></td>
                    <td><Badge tone="ai">{n.proposedDiscountPct ?? 0}%</Badge></td>
                    <td><Badge tone="success">{n.validatedDiscountPct ?? 0}%</Badge>{n.clamped && <> <Badge tone="accent">{t("a.ng.capped")}</Badge></>}</td>
                    <td><button type="button" className="av-tabbtn" aria-expanded={open === n.id} onClick={() => setOpen(open === n.id ? null : n.id)}>{open === n.id ? t("a.ng.hide") : t("a.ng.read")}</button></td>
                  </tr>
                  {open === n.id && <tr><td colSpan={6}><Conversation id={n.id} fallback={n.transcript} /></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onPage={(p) => { const n = new URLSearchParams(params); p === 0 ? n.delete("page") : n.set("page", String(p)); setParams(n); }} />}
    </>
  );
}

/** Each message and answer, with which assistant answered and both numbers. Older chats only have the plain transcript. */
function Conversation({ id, fallback }: { id: string; fallback: string | null }) {
  const { t } = useT();
  const detail = useAsync(() => adminGetNegotiation(id), [id]);
  if (detail.loading && !detail.data) return <Skeleton height={80} />;
  const turns = detail.data?.turns ?? [];
  if (turns.length === 0) return <pre className="av-transcript">{fallback}</pre>;
  return (
    <ol className="av-turns">
      {turns.map((x) => (
        <li key={x.position}>
          <p><strong>{t("a.ng.customer")}:</strong> {x.customerMessage}</p>
          <p><strong>{t("a.ng.shop")}:</strong> {x.reply}</p>
          <p className="av-small av-muted">
            <Badge tone={x.assistant === "llm" ? "ai" : "neutral"}>{t(x.assistant === "llm" ? "a.ng.byAi" : x.assistant === "rules-fallback" ? "a.ng.byFallback" : "a.ng.byRules")}</Badge>{" "}
            {t("a.ng.turnNumbers", { proposed: x.proposedDiscountPct, validated: x.validatedDiscountPct, n: x.quantity, lang: x.language.toUpperCase() })}
          </p>
        </li>
      ))}
    </ol>
  );
}
