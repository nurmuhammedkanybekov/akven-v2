import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { adminListCustomers, adminResetCustomerPassword, adminSetCustomerActive, adminSetTrusted } from "../api/endpoints";
import type { CustomerAccount } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Pagination } from "../components/Pagination";
import { Switch } from "../components/Switch";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { formatDateTime } from "../lib/format";
import { NewPasswordDialog } from "./AdminAccounts";
import { OwnersOnly } from "./OwnersOnly";

/**
 * The owners find a customer by email and mark them as trusted (trusted customers may order from the lower minimum),
 * set a new password for a customer who forgot theirs, or switch off a fake account.
 */
export function AdminCustomers() {
  const { t } = useT();
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.owners")}</span><h1>{t("a.nav.customers")}</h1></div></header>
      <p className="av-lead">{t("a.cu.lead")}</p>
      <OwnersOnly><CustomerList /></OwnersOnly>
    </>
  );
}

function CustomerList() {
  const { t } = useT();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => { const id = window.setTimeout(() => { setQuery(q.trim()); setPage(0); }, 300); return () => window.clearTimeout(id); }, [q]);
  const list = useAsync(() => adminListCustomers({ q: query, page, pageSize: 20 }), [query, page]);
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState<CustomerAccount | null>(null);

  async function switchActive(c: CustomerAccount, on: boolean) {
    try {
      await adminSetCustomerActive(c.id, on);
      setActive((m) => ({ ...m, [c.id]: on }));
      toast(on ? t("a.cu.activeOn", { email: c.email }) : t("a.cu.activeOff", { email: c.email }));
    } catch (e) { toast(e instanceof ApiError ? e.message : t("a.err.save"), "danger"); }
  }

  async function trust(c: CustomerAccount, trusted: boolean) {
    try {
      await adminSetTrusted(c.id, trusted);
      setChanged((m) => ({ ...m, [c.id]: trusted }));
      toast(trusted ? t("a.cu.trustedOn", { email: c.email }) : t("a.cu.trustedOff", { email: c.email }));
    } catch (e) { toast(e instanceof ApiError ? e.message : t("a.err.save"), "danger"); }
  }

  return (
    <section className="av-card-form" aria-label={t("a.nav.customers")}>
      <div className="av-field av-admin__search">
        <label className="av-label" htmlFor="customer-search">{t("a.cu.search")}</label>
        <input id="customer-search" className="av-input" type="search" value={q} placeholder="name@example.com" onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.loading && !list.data && <Skeleton height={120} />}
      {list.error && <Alert tone="danger">{list.error.message}</Alert>}
      {list.data && list.data.items.length === 0 && <p className="av-small">{query ? t("a.cu.noMatch") : t("a.cu.none")}</p>}
      {list.data && list.data.items.length > 0 && (
        <div className="av-tablewrap">
          <table className="av-table">
            <thead><tr><th scope="col">{t("a.ac.email")}</th><th scope="col">{t("a.cu.since")}</th><th scope="col">{t("a.cu.trusted")}</th><th scope="col"><span className="av-visually-hidden">{t("a.cu.actions")}</span></th></tr></thead>
            <tbody>
              {list.data.items.map((c) => {
                const trusted = changed[c.id] ?? c.trusted;
                const on = active[c.id] ?? c.active;
                return (
                  <tr key={c.id}>
                    <td>{c.email}{!on && <> <Badge tone="danger">{t("a.ac.disabled")}</Badge></>}</td>
                    <td className="av-small">{formatDateTime(c.createdAt)}</td>
                    <td><Switch checked={trusted} onChange={(yes) => void trust(c, yes)} label={t("a.cu.trustedFor", { email: c.email })} /></td>
                    <td className="av-admin__rowactions">
                      <Button size="sm" variant="ghost" onClick={() => setResetting(c)}>{t("a.cu.newPassword")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void switchActive(c, !on)}>{on ? t("a.cu.switchOff") : t("a.cu.switchOn")}</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {resetting && <NewPasswordDialog email={resetting.email} save={(password) => adminResetCustomerPassword(resetting.id, password)} onClose={() => setResetting(null)} />}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} />}
    </section>
  );
}
