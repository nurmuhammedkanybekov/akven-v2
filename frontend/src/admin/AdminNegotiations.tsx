import { Fragment, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminListNegotiations } from "../api/endpoints";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Pagination } from "../components/Pagination";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime } from "../lib/format";

/** What the assistant offered next to what the pricing policy allowed, with the full conversation on request. */
export function AdminNegotiations() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get("page") ?? 0) || 0);
  const list = useAsync(() => adminListNegotiations({ page, pageSize: 20 }), [page]);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">Assistant</span><h1>Negotiations</h1></div></header>
      <p className="av-lead">Every chat is recorded. The assistant proposes a discount, the pricing policy decides what is allowed, and a customer can only ever receive the allowed one.</p>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.items.length === 0 && <div className="av-empty"><h2>No negotiations yet</h2></div>}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <caption className="av-visually-hidden">Negotiations</caption>
            <thead><tr><th scope="col">When</th><th scope="col">Customer</th><th scope="col">Item</th><th scope="col">Proposed</th><th scope="col">Validated</th><th scope="col"><span className="av-visually-hidden">Conversation</span></th></tr></thead>
            <tbody>
              {list.data.items.map((n) => (
                <Fragment key={n.id}>
                  <tr>
                    <td className="av-small">{formatDateTime(n.createdAt)}</td>
                    <td>{n.customerEmail}</td>
                    <td>{n.productName}<br /><span className="av-small av-muted">{n.sku}</span></td>
                    <td><Badge tone="ai">{n.proposedDiscountPct ?? 0}%</Badge></td>
                    <td><Badge tone="success">{n.validatedDiscountPct ?? 0}%</Badge>{n.clamped && <> <Badge tone="accent">capped</Badge></>}</td>
                    <td><button type="button" className="av-tabbtn" aria-expanded={open === n.id} onClick={() => setOpen(open === n.id ? null : n.id)}>{open === n.id ? "Hide" : "Read"}</button></td>
                  </tr>
                  {open === n.id && <tr><td colSpan={6}><pre className="av-transcript">{n.transcript}</pre></td></tr>}
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
