import { useState } from "react";
import { adminHandleWholesale, adminWholesale } from "../api/endpoints";
import type { WholesaleLine, WholesaleStatus } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Textarea } from "../components/Field";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { formatDateTime } from "../lib/format";

const TABS: Array<WholesaleStatus | "ALL"> = ["NEW", "IN_PROGRESS", "ANSWERED", "CLOSED", "ALL"];

/** A link that opens the customer's chosen way of talking: their WhatsApp, Telegram, phone or email. */
function replyLink(r: WholesaleLine): string {
  const digits = r.contact.replace(/\D/g, "");
  switch (r.contactKind) {
    case "WHATSAPP": return `https://wa.me/${digits}`;
    case "TELEGRAM": return r.contact.startsWith("@") ? `https://t.me/${r.contact.slice(1)}` : `https://t.me/+${digits}`;
    case "PHONE": return `tel:+${digits}`;
    case "EMAIL": return `mailto:${r.contact}?subject=${encodeURIComponent(`AK&VEN · ${r.reference}`)}`;
  }
}

/**
 * Requests from shops and companies, newest first. The family picks one up, answers in the customer's own messenger
 * (one tap), and closes it; a note keeps what was agreed. Every change is audited on the server.
 */
export function AdminWholesale() {
  const { t } = useT();
  const toast = useToast();
  const [tab, setTab] = useState<WholesaleStatus | "ALL">("NEW");
  const list = useAsync(() => adminWholesale(tab === "ALL" ? undefined : tab), [tab]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function handle(r: WholesaleLine, status: WholesaleStatus) {
    setBusy(r.id);
    try {
      await adminHandleWholesale(r.id, status, notes[r.id] ?? r.staffNote);
      toast(t("a.wh.saved"));
      list.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("a.err.generic"), "danger");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{t("a.group.shop")}</span><h1>{t("a.nav.wholesale")}</h1></div>
        {list.data && list.data.waiting > 0 && <Badge tone="accent">{t("a.wh.waiting", { n: list.data.waiting })}</Badge>}
      </header>
      <p className="av-lead">{t("a.wh.lead")}</p>
      <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.show")}>
        {TABS.map((s) => <button key={s} type="button" className="av-tabbtn" aria-pressed={tab === s} onClick={() => setTab(s)}>{t(`a.wh.${s}` as MessageKey)}</button>)}
      </div>
      {list.loading && !list.data && <Skeleton height={200} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.requests.length === 0 && <p className="av-small">{t("a.wh.none")}</p>}
      <ul className="av-modlist">
        {(list.data?.requests ?? []).map((r) => (
          <li key={r.id} className="av-card-form av-whinbox">
            <div className="av-row av-between">
              <div className="av-row">
                <strong className="av-whinbox__ref">{r.reference}</strong>
                <Badge tone={r.kind === "GIFTS" ? "accent" : "neutral"}>{t(r.kind === "GIFTS" ? "a.wh.gifts" : "a.wh.stock")}</Badge>
                {tab === "ALL" && <Badge>{t(`a.wh.${r.status}` as MessageKey)}</Badge>}
              </div>
              <span className="av-small av-muted">{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="av-whinbox__who">
              <strong>{r.company}</strong>{r.city && <> · {r.city}</>} · <span className="av-num">{t("bag.pairs", { n: r.pairs })}</span>
            </p>
            {r.mix && <p className="av-small av-whinbox__mix">{r.mix}</p>}
            {r.note && <p className="av-modlist__body">{r.note}</p>}
            <p className="av-small">
              {t(`quote.ck${r.contactKind}` as MessageKey)}: <a href={replyLink(r)} target="_blank" rel="noopener noreferrer">{r.contact}</a>
              {r.accountEmail && <> · {t("a.wh.account", { email: r.accountEmail })}</>}
            </p>
            <Textarea label={t("a.wh.note")} rows={2} maxLength={500} value={notes[r.id] ?? r.staffNote ?? ""}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
            <div className="av-row">
              <Button size="sm" variant="secondary" href={replyLink(r)} target="_blank" rel="noopener noreferrer">{t("a.wh.reply")}</Button>
              {r.status === "NEW" && <Button size="sm" loading={busy === r.id} onClick={() => void handle(r, "IN_PROGRESS")}>{t("a.wh.take")}</Button>}
              {r.status !== "ANSWERED" && r.status !== "CLOSED" && <Button size="sm" loading={busy === r.id} onClick={() => void handle(r, "ANSWERED")}>{t("a.wh.answered")}</Button>}
              {r.status !== "CLOSED" && <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => void handle(r, "CLOSED")}>{t("a.wh.close")}</Button>}
              {(notes[r.id] ?? null) !== null && notes[r.id] !== (r.staffNote ?? "") && (
                <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => void handle(r, r.status)}>{t("a.wh.saveNote")}</Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
