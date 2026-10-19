import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { cancelStockRequest, getSizeChart, listMyOrders, myStockRequests } from "../api/endpoints";
import type { FamilyMemberInput, FamilyRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { SockArt } from "../brand/SockArt";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { GiftIcon } from "../components/icons";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { QuantityStepper } from "../components/QuantityStepper";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { formatDateTime } from "../lib/format";
import { CATEGORY_PATH } from "../lib/labels";
import { ART, DEFAULT_SHOE, MAX_MEMBERS, MAX_PAIRS, ROLES, SHOES, categoryFor, daysToBirthday, sockSizeFor, useFamily } from "../shop/family";
import { useMoney } from "../shop/useMoney";

/** A row being edited: a key that stays put while rows are added and removed, so inputs keep their focus. */
type Draft = FamilyMemberInput & { key: number };
const TODAY = () => new Date().toISOString().slice(0, 10);

/**
 * The customer's own page: the family they buy for (names, shoe sizes, birthdays), whose birthday is coming up, the
 * sold-out socks they are waiting for, and their latest orders. Everything here belongs to the signed-in account only.
 */
export function AccountPage() {
  const { t } = useT();
  const { session, signOut } = useAuth();
  const family = useFamily();

  return (
    <div className="av-container av-page av-account">
      <header className="av-page__head">
        <span className="av-eyebrow">{session?.email}</span>
        <h1>{t("acc.title")}</h1>
        <p className="av-lead">{t("acc.lead")}</p>
      </header>

      {family.members && <Birthdays members={family.members} />}

      <div className="av-account__grid">
        <section id="family" className="av-account__card av-account__card--wide" aria-labelledby="acc-family">
          <h2 id="acc-family">{t("acc.family")}</h2>
          <p className="av-small">{t("acc.familyLead")}</p>
          {family.members === null ? <Skeleton height={160} /> : <FamilyEditor initial={family.members} save={family.save} />}
        </section>
        <Waiting />
        <RecentOrders />
      </div>

      <div className="av-row av-account__out"><Button variant="ghost" onClick={signOut}>{t("acc.signOut")}</Button></div>
    </div>
  );
}

/** Whose birthday is within the next month, nearest first, each with a way to make them a gift box. */
function Birthdays({ members }: { members: FamilyMemberInput[] }) {
  const { t } = useT();
  const soon = members
    .map((m) => ({ m, days: daysToBirthday(m.birthday) }))
    .filter((x): x is { m: FamilyMemberInput; days: number } => x.days !== null && x.days <= 30)
    .sort((a, b) => a.days - b.days);
  if (soon.length === 0) return null;
  return (
    <ul className="av-bdays" aria-label={t("acc.bdays")}>
      {soon.map(({ m, days }, i) => {
        const name = m.name || t(`family.${m.role}` as MessageKey);
        return (
          <li key={i} className={days === 0 ? "is-today" : undefined} style={{ "--i": i } as React.CSSProperties}>
            <span className="av-bdays__icon" aria-hidden="true"><GiftIcon /></span>
            <span className="av-bdays__text">{days === 0 ? t("acc.bdayToday", { name }) : t("acc.bday", { name, n: days })}</span>
            <Button to={`/gift?for=${encodeURIComponent(name)}`} size="sm" variant="accent">{t("acc.bdayCta")}</Button>
          </li>
        );
      })}
    </ul>
  );
}

function FamilyEditor({ initial, save }: { initial: FamilyMemberInput[]; save: (m: FamilyMemberInput[]) => Promise<unknown> }) {
  const { t, lang } = useT();
  const toast = useToast();
  const chart = useAsync((signal) => getSizeChart(lang, signal), [lang]);
  const rows = chart.data?.rows ?? [];
  const [drafts, setDrafts] = useState<Draft[]>(() => initial.map((m, i) => ({ ...m, key: i + 1 })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDrafts(initial.map((m, i) => ({ ...m, key: i + 1 }))); }, [initial, dirty]);

  const change = (key: number, patch: Partial<Draft>) => { setDirty(true); setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d))); };
  const add = (role: FamilyRole) => {
    setDirty(true);
    setDrafts((ds) => ds.length >= MAX_MEMBERS ? ds
      : [...ds, { key: Math.max(0, ...ds.map((d) => d.key)) + 1, name: null, role, shoeSize: DEFAULT_SHOE[role], pairs: 3, birthday: null }]);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await save(drafts.map((m) => ({ name: m.name?.trim() || null, role: m.role, shoeSize: m.shoeSize, pairs: m.pairs, birthday: m.birthday || null })));
      setDirty(false);
      toast(t("family.saved"));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? t("family.saveError") : t("acc.saveFailed"));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      {drafts.length === 0 && <p className="av-account__empty">{t("acc.empty")}</p>}
      <ul className="av-members">
        {drafts.map((d) => {
          const size = sockSizeFor(rows, d.shoeSize, d.role);
          const label = d.name?.trim() || t(`family.${d.role}` as MessageKey);
          return (
            <li key={d.key} className="av-member">
              <SockArt {...ART[d.role]} className="av-member__art" />
              <label className="av-member__f av-member__f--name">
                <span>{t("acc.name")}</span>
                <input className="av-input" value={d.name ?? ""} maxLength={40} placeholder={t(`family.${d.role}` as MessageKey)}
                       autoComplete="off" onChange={(e) => change(d.key, { name: e.target.value })} />
              </label>
              <label className="av-member__f">
                <span>{t("acc.role")}</span>
                <select className="av-select" value={d.role} onChange={(e) => change(d.key, { role: e.target.value as FamilyRole })}>
                  {ROLES.map((r) => <option key={r} value={r}>{t(`family.${r}` as MessageKey)}</option>)}
                </select>
              </label>
              <label className="av-member__f">
                <span>{t("family.shoe")}</span>
                <select className="av-select" value={d.shoeSize} onChange={(e) => change(d.key, { shoeSize: Number(e.target.value) })}>
                  {SHOES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="av-member__f av-member__f--wide">
                <span>{t("acc.birthday")}</span>
                <input className="av-input" type="date" value={d.birthday ?? ""} max={TODAY()} min="1900-01-01"
                       onChange={(e) => change(d.key, { birthday: e.target.value || null })} />
              </label>
              <div className="av-member__f av-member__f--wide">
                <span>{t("family.pairs")}</span>
                <QuantityStepper value={d.pairs} max={MAX_PAIRS} label={`${label}: ${t("family.pairs")}`} onChange={(n) => change(d.key, { pairs: n })} />
              </div>
              <div className="av-member__foot">
                <span className="av-small">{size ? t("family.sockSize", { label: `${size.label} ${size.local.min}–${size.local.max}` }) : t("family.noSize")}</span>
                <Link className="av-small" to={CATEGORY_PATH[categoryFor(d)]}>{t("acc.shopFor", { who: label })}</Link>
                <button type="button" className="av-linkbtn" onClick={() => { setDirty(true); setDrafts((ds) => ds.filter((x) => x.key !== d.key)); }}>
                  {t("family.remove", { who: label })}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="av-family__add" role="group" aria-label={t("family.addLabel")}>
        {ROLES.map((r) => (
          <button key={r} type="button" className="av-family__chip" onClick={() => add(r)} disabled={drafts.length >= MAX_MEMBERS}>
            <span aria-hidden="true">+</span> {t(`family.${r}` as MessageKey)}
          </button>
        ))}
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-row">
        <Button type="submit" loading={busy} disabled={!dirty}>{t("acc.save")}</Button>
        {dirty && <span className="av-small av-muted" role="status">{t("acc.unsaved")}</span>}
      </div>
    </form>
  );
}

/** The sold-out options this customer asked about. */
function Waiting() {
  const { t } = useT();
  const list = useAsync(() => myStockRequests(), []);
  const [skus, setSkus] = useState<string[] | null>(null);
  const shown = skus ?? list.data ?? null;
  return (
    <section className="av-account__card" aria-labelledby="acc-waiting">
      <h2 id="acc-waiting">{t("acc.waiting")}</h2>
      {shown === null ? <Skeleton height={60} /> : shown.length === 0 ? <p className="av-small">{t("acc.waitingNone")}</p> : (
        <>
          <p className="av-small">{t("acc.waitingLead")}</p>
          <ul className="av-waitlist">
            {shown.map((sku) => (
              <li key={sku}>
                <code>{sku}</code>
                <button type="button" className="av-linkbtn" aria-label={t("acc.stopWaiting", { sku })}
                        onClick={() => void cancelStockRequest(sku).then(setSkus).catch(() => undefined)}>{t("acc.stop")}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function RecentOrders() {
  const { t } = useT();
  const { money } = useMoney();
  const orders = useAsync(() => listMyOrders(), []);
  const latest = useMemo(() => (orders.data ?? []).slice(0, 3), [orders.data]);
  return (
    <section className="av-account__card" aria-labelledby="acc-orders">
      <h2 id="acc-orders">{t("acc.orders")}</h2>
      {orders.loading && !orders.data && <Skeleton height={60} />}
      {orders.data && latest.length === 0 && <p className="av-small">{t("acc.noOrders")}</p>}
      {latest.length > 0 && (
        <ul className="av-minilines">
          {latest.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`}><strong>{o.reference}</strong><br /><span className="av-small av-muted">{formatDateTime(o.createdAt)}</span></Link>
              <span className="av-account__order"><OrderStatusBadge status={o.status} /><span className="av-price">{money(o.total)}</span></span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/orders" className="av-small">{t("acc.allOrders")}</Link>
    </section>
  );
}
