import { useState } from "react";
import { Link } from "react-router-dom";
import { adminModerateReview, adminReviews } from "../api/endpoints";
import type { ReviewStatus } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Stars } from "../components/Stars";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { formatDateTime } from "../lib/format";

const TABS: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

/**
 * Reviews waiting for the owners: what the customer wrote, about which sock, from which account. Approving puts it on
 * the product page (and, with four or five stars, on the home page); rejecting keeps it off. Every decision is audited.
 */
export function AdminReviews() {
  const { t } = useT();
  const toast = useToast();
  const [tab, setTab] = useState<ReviewStatus>("PENDING");
  const list = useAsync(() => adminReviews(tab), [tab]);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, status: ReviewStatus) {
    setBusy(id);
    try { await adminModerateReview(id, status); toast(t(status === "APPROVED" ? "a.rv.approved" : "a.rv.rejected")); list.reload(); }
    catch { toast(t("a.err.generic"), "danger"); }
    finally { setBusy(null); }
  }

  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.shop")}</span><h1>{t("a.nav.reviews")}</h1></div></header>
      <p className="av-lead">{t("a.rv.lead")}</p>
      <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.show")}>
        {TABS.map((s) => <button key={s} type="button" className="av-tabbtn" aria-pressed={tab === s} onClick={() => setTab(s)}>{t(`a.rv.${s}` as MessageKey)}</button>)}
      </div>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.length === 0 && <p className="av-small">{t("a.rv.none")}</p>}
      <ul className="av-modlist">
        {(list.data ?? []).map((r) => (
          <li key={r.id} className="av-card-form">
            <div className="av-row av-between">
              <Stars value={r.rating} />
              <span className="av-small av-muted">{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="av-modlist__body">{r.body}</p>
            <p className="av-small">
              <strong>{r.author || t("rv.anon")}</strong> · {r.customerEmail} · {r.productSlug ? <Link to={`/products/${r.productSlug}`} target="_blank" rel="noreferrer">{r.productName}</Link> : r.productName}
            </p>
            <div className="av-row">
              {r.status !== "APPROVED" && <Button size="sm" loading={busy === r.id} onClick={() => void decide(r.id, "APPROVED")}>{t("a.rv.approve")}</Button>}
              {r.status !== "REJECTED" && <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => void decide(r.id, "REJECTED")}>{t("a.rv.reject")}</Button>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
