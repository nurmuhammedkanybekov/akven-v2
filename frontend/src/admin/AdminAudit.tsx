import { useState } from "react";
import { adminAuditLog } from "../api/endpoints";
import type { AuditArea, AuditLine } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge, type BadgeTone } from "../components/Badge";
import { Pagination } from "../components/Pagination";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { actionLabel } from "./helpers";
import { SuperAdminOnly } from "./SuperAdminOnly";

const AREAS: Array<AuditArea | ""> = ["", "orders", "catalog", "prices", "delivery", "people", "chat", "shop", "messages"];
const WHO = ["", "team", "customers", "guests"] as const;
const ROLE_TONE: Record<string, BadgeTone> = { SUPER_ADMIN: "ai", ADMIN: "accent", STAFF: "neutral", CUSTOMER: "success", GUEST: "warning" };

/** UC-8: every change, one part of the shop at a time: who did it, to what, and what changed from what to what. */
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

type Json = Record<string, unknown>;
const parse = (s: string | null): Json | null => { if (!s) return null; try { const v = JSON.parse(s); return v && typeof v === "object" && !Array.isArray(v) ? v : { value: v }; } catch { return { value: s }; } };
const short = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length > 3 ? `${v.slice(0, 3).map(short).join(", ")} … (+${v.length - 3})` : v.map(short).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
};
/** What the entry is about, in words a person recognises: an order number, a sock's code, a name. */
function subject(e: AuditLine, before: Json | null, after: Json | null): string | null {
  const o = { ...(before ?? {}), ...(after ?? {}) };
  for (const k of ["reference", "name", "sku", "email", "label", "slug", "minPairs"]) if (o[k] != null && o[k] !== "") return (k === "minPairs" ? "≥ " : "") + String(o[k]);
  return e.entityId ? e.entityId.slice(0, 8) : null;
}
/** The fields that changed: removed, added or changed from one value to another. */
function changes(before: Json | null, after: Json | null): Array<{ key: string; from?: string; to?: string }> {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const out: Array<{ key: string; from?: string; to?: string }> = [];
  for (const k of keys) {
    const b = before?.[k], a = after?.[k];
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    out.push({ key: k, from: before && k in before ? short(b) : undefined, to: after && k in after ? short(a) : undefined });
  }
  return out;
}
const LOCALE = { en: "en-GB", ru: "ru-RU", ky: "ky-KG" } as const;
const day = (iso: string, lang: keyof typeof LOCALE) => new Date(iso).toLocaleDateString(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function AuditList() {
  const { t, lang } = useT();
  const [page, setPage] = useState(0);
  const [area, setArea] = useState<AuditArea | "">("");
  const [who, setWho] = useState<string>("");
  const [open, setOpen] = useState<string | null>(null);
  const log = useAsync(() => adminAuditLog({ area: area || undefined, who: who || undefined, page, pageSize: 50 }), [area, who, page]);
  const choose = (f: () => void) => { f(); setPage(0); };

  return (
    <>
      <div className="av-tabs av-tabs--inline av-audit__areas" role="group" aria-label={t("a.au.area")}>
        {AREAS.map((a) => <button key={a || "all"} type="button" className="av-tabbtn" aria-pressed={area === a} onClick={() => choose(() => setArea(a))}>{t(a ? (`a.au.area.${a}` as MessageKey) : "a.all")}</button>)}
      </div>
      <div className="av-row av-audit__who">
        <label className="av-sortpick"><span className="av-small">{t("a.au.who")}</span>
          <select className="av-select" value={WHO.includes(who as typeof WHO[number]) ? who : "email"} onChange={(e) => choose(() => setWho(e.target.value === "email" ? "" : e.target.value))}>
            {WHO.map((w) => <option key={w || "all"} value={w}>{t(w ? (`a.au.who.${w}` as MessageKey) : "a.au.who.all")}</option>)}
          </select>
        </label>
        <input className="av-input av-audit__email" type="search" placeholder={t("a.au.byEmail")} aria-label={t("a.au.byEmail")}
               onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); choose(() => setWho(v)); } }} />
        {log.data && <span className="av-small av-muted">{t("a.au.count", { n: log.data.totalItems })}</span>}
      </div>
      {log.loading && !log.data && <Skeleton height={240} />}
      {log.error && <Alert tone="danger">{log.error.message}</Alert>}
      {log.data && log.data.items.length === 0 && <p className="av-small">{t("a.au.none")}</p>}
      {log.data && log.data.items.length > 0 && (
        <ol className="av-audit">
          {log.data.items.map((e, i) => {
            const before = parse(e.before), after = parse(e.after);
            const about = subject(e, before, after);
            const diff = changes(before, after).filter((d) => d.to !== about && d.from !== about);
            const newDay = i === 0 || day(log.data!.items[i - 1].at, lang) !== day(e.at, lang);
            const verb = !before && after ? "add" : before && !after ? "remove" : "change";
            return (
              <li key={e.id} className={`av-audit__row av-audit__row--${verb}`}>
                {newDay && <h3 className="av-audit__day">{day(e.at, lang)}</h3>}
                <div className="av-audit__line">
                  <time className="av-audit__time av-small" dateTime={e.at}>{time(e.at)}</time>
                  <span className="av-audit__dot" aria-hidden="true" />
                  <div className="av-audit__body">
                    <p className="av-audit__head">
                      <strong>{actionLabel(e.action, t)}</strong>
                      {about && <span className="av-audit__subject">{about}</span>}
                    </p>
                    <p className="av-small av-audit__by">
                      {e.actor}{e.actorRole && <> <Badge tone={ROLE_TONE[e.actorRole] ?? "neutral"}>{t(`a.au.role.${e.actorRole}` as MessageKey)}</Badge></>}
                      <span className="av-muted"> · {t(`a.au.type.${e.entityType}` as MessageKey) ?? e.entityType}</span>
                    </p>
                    {diff.length > 0 && (
                      <ul className="av-audit__diff">
                        {diff.slice(0, open === e.id ? diff.length : 4).map((d) => (
                          <li key={d.key}>
                            <span className="av-audit__key">{d.key}</span>
                            {d.from !== undefined && <del>{d.from}</del>}
                            {d.from !== undefined && d.to !== undefined && <span aria-hidden="true"> → </span>}
                            {d.to !== undefined && <ins>{d.to}</ins>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {diff.length > 4 && <button type="button" className="av-linkbtn av-small" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
                      {open === e.id ? t("a.ng.hide") : t("a.au.more", { n: diff.length - 4 })}</button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {log.data && <Pagination page={log.data.page} totalPages={log.data.totalPages} onPage={setPage} />}
    </>
  );
}
