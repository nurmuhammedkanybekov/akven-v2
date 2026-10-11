import { Fragment, useState } from "react";
import { adminAuditLog } from "../api/endpoints";
import { Alert, Skeleton } from "../components/Alert";
import { Pagination } from "../components/Pagination";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import { formatDateTime } from "../lib/format";
import { actionLabel } from "./helpers";
import { SuperAdminOnly } from "./SuperAdminOnly";

/** UC-8: every change anyone made in the admin, newest first, with who did it and the values before and after. */
export function AdminAudit() {
  const { t } = useT();
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.system")}</span><h1>{t("a.nav.audit")}</h1></div></header>
      <p className="av-lead">{t("a.au.lead")}</p>
      <SuperAdminOnly><AuditList /></SuperAdminOnly>
    </>
  );
}

function AuditList() {
  const { t } = useT();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const log = useAsync(() => adminAuditLog({ page, pageSize: 50 }), [page]);
  if (log.loading && !log.data) return <Skeleton height={240} />;
  if (log.error || !log.data) return <Alert tone="danger">{log.error?.message ?? t("a.err.generic")}</Alert>;
  return (
    <>
      <div className="av-tablewrap">
        <table className="av-table">
          <thead><tr><th scope="col">{t("a.ng.when")}</th><th scope="col">{t("a.au.who")}</th><th scope="col">{t("a.au.what")}</th><th scope="col"><span className="av-visually-hidden">{t("a.au.details")}</span></th></tr></thead>
          <tbody>
            {log.data.items.map((e) => (
              <Fragment key={e.id}>
                <tr>
                  <td className="av-small">{formatDateTime(e.at)}</td>
                  <td>{e.actor}</td>
                  <td>{actionLabel(e.action, t)}<br /><span className="av-small av-muted">{e.entityType}</span></td>
                  <td>{(e.before || e.after) && <button type="button" className="av-tabbtn" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? t("a.ng.hide") : t("a.au.show")}</button>}</td>
                </tr>
                {open === e.id && (
                  <tr><td colSpan={4}>
                    <div className="av-formgrid">
                      <div><span className="av-label">{t("a.au.before")}</span><pre className="av-transcript">{pretty(e.before)}</pre></div>
                      <div><span className="av-label">{t("a.au.after")}</span><pre className="av-transcript">{pretty(e.after)}</pre></div>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={log.data.page} totalPages={log.data.totalPages} onPage={setPage} />
    </>
  );
}

function pretty(json: string | null): string {
  if (!json) return "—";
  try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; }
}
