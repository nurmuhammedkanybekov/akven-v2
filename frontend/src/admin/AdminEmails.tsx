import { useState } from "react";
import { Link } from "react-router-dom";
import { adminEmails, adminOrderEmails, adminRetryEmail } from "../api/endpoints";
import type { EmailStatus, OutboundEmail } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge, type BadgeTone } from "../components/Badge";
import { Button } from "../components/Button";
import { Pagination } from "../components/Pagination";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { formatDateTime } from "../lib/format";

const TABS: Array<EmailStatus | "ALL"> = ["ALL", "QUEUED", "SENT", "NOT_SENT", "FAILED"];
const TONE: Record<EmailStatus, BadgeTone> = { QUEUED: "neutral", SENT: "success", NOT_SENT: "warning", FAILED: "danger" };

/** One email: whom, what about, whether it went out, and the words themselves behind a tap. */
/** canResend: a kept email can only go out once a mail server is set up; a failed one can always be tried again. */
function EmailRow({ e, onRetried, showOrder = true, canResend }: { e: OutboundEmail; onRetried: () => void; showOrder?: boolean; canResend: boolean }) {
  const { t } = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    try { await adminRetryEmail(e.id); toast(t("a.em.retried")); onRetried(); }
    catch (err) { toast(err instanceof Error ? err.message : t("a.err.generic"), "danger"); }
    finally { setBusy(false); }
  }
  return (
    <li className="av-card-form av-email">
      <div className="av-row av-between">
        <div className="av-row">
          <Badge tone={TONE[e.status]}>{t(`a.em.${e.status}` as MessageKey)}</Badge>
          <span className="av-small">{t(`a.em.kind.${e.kind}` as MessageKey)}</span>
          <span className="av-small av-muted">{e.lang.toUpperCase()}</span>
        </div>
        <span className="av-small av-muted">{formatDateTime(e.sentAt ?? e.createdAt)}</span>
      </div>
      <p className="av-email__subject"><strong>{e.subject}</strong></p>
      <p className="av-small">{t("a.em.to", { to: e.to })}
        {showOrder && e.orderId && <> · <Link to={`/admin/orders/${e.orderId}`}>{t("a.em.order")}</Link></>}</p>
      {e.lastError && e.status !== "SENT" && <p className="av-small av-muted">{e.lastError}{e.attempts > 0 && ` (${t("a.em.tries", { n: e.attempts })})`}</p>}
      <details className="av-email__body">
        <summary>{t("a.em.read")}</summary>
        <pre>{e.body}</pre>
      </details>
      {(e.status === "FAILED" || (e.status === "NOT_SENT" && canResend)) && (
        <div className="av-row"><Button size="sm" variant="secondary" loading={busy} onClick={() => void retry()}>{t("a.em.retry")}</Button></div>
      )}
    </li>
  );
}

/**
 * The emails the shop wrote to customers. Without a mail server (demo mode) they are kept here, not sent: the banner
 * says so, so nobody believes a customer was told something they were not.
 */
export function AdminEmails() {
  const { t } = useT();
  const [tab, setTab] = useState<EmailStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const list = useAsync(() => adminEmails(tab === "ALL" ? undefined : tab, page), [tab, page]);
  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{t("a.group.shop")}</span><h1>{t("a.nav.emails")}</h1></div>
        {list.data && list.data.failed > 0 && <Badge tone="danger">{t("a.em.failedN", { n: list.data.failed })}</Badge>}
      </header>
      <p className="av-lead">{t("a.em.lead")}</p>
      {list.data?.mode === "OFF" && <Alert>{t("a.em.off")}</Alert>}
      <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.show")}>
        {TABS.map((s) => (
          <button key={s} type="button" className="av-tabbtn" aria-pressed={tab === s} onClick={() => { setTab(s); setPage(0); }}>
            {t(s === "ALL" ? "a.em.all" : (`a.em.${s}` as MessageKey))}
          </button>
        ))}
      </div>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.emails.items.length === 0 && <p className="av-small">{t("a.em.none")}</p>}
      <ul className="av-modlist">
        {(list.data?.emails.items ?? []).map((e) => <EmailRow key={`${e.id}-${e.status}`} e={e} onRetried={list.reload} canResend={list.data?.mode === "SMTP"} />)}
      </ul>
      {list.data && <Pagination page={list.data.emails.page} totalPages={list.data.emails.totalPages} onPage={setPage} />}
    </>
  );
}

/** On an order's page: what the customer was told, and when. */
export function OrderEmails({ orderId }: { orderId: string }) {
  const { t } = useT();
  const list = useAsync(() => adminOrderEmails(orderId), [orderId]);
  if (!list.data || list.data.length === 0) return null;
  return (
    <div className="av-card-form">
      <h2 className="av-formtitle">{t("a.em.forOrder")}</h2>
      <ul className="av-modlist">
        {list.data.map((e) => <EmailRow key={`${e.id}-${e.status}`} e={e} onRetried={list.reload} showOrder={false} canResend={false} />)}
      </ul>
    </div>
  );
}
