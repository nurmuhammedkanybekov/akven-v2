import { Fragment, useState, type FormEvent } from "react";
import { useMoney } from "../shop/useMoney";
import { adminCreateDeliveryZone, adminDeleteDeliveryZone, adminDeliveryZones, adminUpdateDeliveryZone } from "../api/endpoints";
import type { Country, DeliveryKind, DeliveryZone, DeliveryZoneInput } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input, Select, Textarea } from "../components/Field";
import { Switch } from "../components/Switch";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { OwnersOnly } from "./OwnersOnly";

const COUNTRIES: Country[] = ["KG", "KZ", "UZ", "RU"];
const EMPTY: DeliveryZoneInput = { country: "KG", name: "", fee: 0, freeFrom: null, daysMin: null, daysMax: null, active: true, position: 0,
  kind: "COURIER", payOnReceipt: false, note: null };

type Draft = { country: Country; name: string; fee: string; freeFrom: string; daysMin: string; daysMax: string; active: boolean; position: string;
  kind: DeliveryKind; payOnReceipt: boolean; note: string };
const toDraft = (z: DeliveryZoneInput): Draft => ({
  country: z.country, name: z.name, fee: String(z.fee), freeFrom: z.freeFrom == null ? "" : String(z.freeFrom),
  daysMin: z.daysMin == null ? "" : String(z.daysMin), daysMax: z.daysMax == null ? "" : String(z.daysMax), active: z.active, position: String(z.position),
  kind: z.kind ?? "COURIER", payOnReceipt: !!z.payOnReceipt, note: z.note ?? "",
});
const fromDraft = (d: Draft): DeliveryZoneInput => ({
  country: d.country, name: d.name.trim(), fee: Number(d.fee || 0), freeFrom: d.freeFrom.trim() ? Number(d.freeFrom) : null,
  daysMin: d.daysMin.trim() ? Number(d.daysMin) : null, daysMax: d.daysMax.trim() ? Number(d.daysMax) : null, active: d.active, position: Number(d.position || 0),
  kind: d.kind, payOnReceipt: d.kind === "CARGO" && d.payOnReceipt, note: d.note.trim() || null,
});

/** One area as an editable card: the owners change a price and press save; the server checks and audits it. */
function ZoneForm({ zone, onDone }: { zone: DeliveryZone | null; onDone: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [d, setD] = useState<Draft>(() => toDraft(zone ?? EMPTY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (zone) await adminUpdateDeliveryZone(zone.id, fromDraft(d)); else await adminCreateDeliveryZone(fromDraft(d));
      toast(t("a.dz.saved"));
      if (!zone) setD(toDraft(EMPTY));
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : t("a.err.generic")); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!zone || !window.confirm(t("a.dz.confirm"))) return;
    setBusy(true);
    try { await adminDeleteDeliveryZone(zone.id); toast(t("a.dz.deleted")); onDone(); }
    catch (err) { setError(err instanceof Error ? err.message : t("a.err.generic")); setBusy(false); }
  }

  return (
    <form className="av-card-form av-dzone" onSubmit={save} aria-label={zone ? zone.name : t("a.dz.new")}>
      <div className="av-dzone__grid">
        <Select label={t("a.dz.kind")} value={d.kind} onChange={set("kind")}>
          <option value="COURIER">{t("a.dz.kindCourier")}</option>
          <option value="CARGO">{t("a.dz.kindCargo")}</option>
        </Select>
        <Select label={t("a.dz.country")} value={d.country} onChange={set("country")}>
          {COUNTRIES.map((c) => <option key={c} value={c}>{t(`country.${c}` as MessageKey)}</option>)}
        </Select>
        <Input label={t("a.dz.name")} required minLength={2} maxLength={60} value={d.name} onChange={set("name")} />
        <Input label={t("a.dz.fee")} type="number" min={0} max={1000} step="0.01" required value={d.fee} onChange={set("fee")} />
        <Input label={t("a.dz.freeFrom")} type="number" min={0.01} step="0.01" value={d.freeFrom} onChange={set("freeFrom")} />
        <Input label={t("a.dz.daysMin")} type="number" min={0} max={60} value={d.daysMin} onChange={set("daysMin")} />
        <Input label={t("a.dz.daysMax")} type="number" min={0} max={60} value={d.daysMax} onChange={set("daysMax")} />
      </div>
      <Textarea label={t("a.dz.note")} hint={t("a.dz.noteHint")} rows={2} maxLength={300} value={d.note}
                onChange={(e) => setD({ ...d, note: e.target.value })} />
      {d.kind === "CARGO" && <Switch checked={d.payOnReceipt} onChange={(payOnReceipt) => setD({ ...d, payOnReceipt })} label={t("a.dz.payOnReceipt")} />}
      <Switch checked={d.active} onChange={(active) => setD({ ...d, active })} label={t("a.dz.active")} />
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-row">
        <Button type="submit" size="sm" loading={busy}>{zone ? t("a.dz.save") : t("a.dz.add")}</Button>
        {zone && <Button type="button" size="sm" variant="ghost" onClick={() => void remove()} disabled={busy}>{t("a.dz.delete")}</Button>}
      </div>
    </form>
  );
}

const FLAG: Record<Country, string> = { KG: "🇰🇬", KZ: "🇰🇿", UZ: "🇺🇿", RU: "🇷🇺" };

/** Delivery areas: where the shop delivers, the fee, the free-from amount and the days, as a table; a row opens to edit. Owners only. */
export function AdminDelivery() {
  const { t } = useT();
  const { money } = useMoney();
  const list = useAsync(() => adminDeliveryZones(), []);
  const [open, setOpen] = useState<string | null>(null);
  const done = () => { setOpen(null); list.reload(); };
  const days = (z: DeliveryZone) => z.daysMin == null ? "—" : z.daysMax == null || z.daysMax === z.daysMin ? t("co.day", { n: z.daysMin }) : t("co.days", { min: z.daysMin, max: z.daysMax });
  const groups: Array<[DeliveryKind, string]> = [["COURIER", t("a.dz.kindCourier")], ["CARGO", t("a.dz.kindCargo")]];
  return (
    <>
      <header className="av-admin__head">
        <div><span className="av-eyebrow">{t("a.group.owners")}</span><h1>{t("a.nav.delivery")}</h1></div>
        <OwnersOnly><Button onClick={() => setOpen(open === "new" ? null : "new")}>{t("a.dz.new")}</Button></OwnersOnly>
      </header>
      <p className="av-lead">{t("a.dz.lead")}</p>
      <OwnersOnly>
        {open === "new" && <div className="av-dzone__new"><ZoneForm zone={null} onDone={done} /></div>}
        {list.loading && !list.data && <Skeleton height={200} />}
        {list.error && <Alert tone="danger">{list.error.message}</Alert>}
        {groups.map(([kind, title]) => {
          const zones = (list.data ?? []).filter((z) => (z.kind ?? "COURIER") === kind);
          if (!list.data) return null;
          return (
            <section key={kind} className="av-card-form av-dzgroup" aria-label={title}>
              <h2 className="av-formtitle">{kind === "COURIER" ? "🚕" : "🚌"} {title} <span className="av-small av-muted">· {zones.length}</span></h2>
              {zones.length === 0 ? <p className="av-small">{t("a.dz.noneOfKind")}</p> : (
                <div className="av-tablewrap">
                  <table className="av-table av-dztable">
                    <thead><tr>
                      <th scope="col">{t("a.dz.name")}</th><th scope="col">{t("a.dz.fee")}</th><th scope="col">{t("a.dz.freeFromShort")}</th>
                      <th scope="col">{t("a.dz.daysShort")}</th><th scope="col">{t("a.dz.shownShort")}</th><th scope="col"><span className="av-visually-hidden">{t("a.cu.actions")}</span></th>
                    </tr></thead>
                    <tbody>
                      {zones.map((z) => (
                        <Fragment key={z.id}>
                          <tr className={open === z.id ? "is-open" : undefined}>
                            <td><strong>{FLAG[z.country]} {z.name}</strong>
                              {z.payOnReceipt && <> <Badge tone="accent">{t("a.dz.payOnReceiptShort")}</Badge></>}
                              {z.note && <><br /><span className="av-small av-muted av-dztable__note">{z.note}</span></>}</td>
                            <td className="av-num">{Number(z.fee) === 0 ? t("co.free") : money(Number(z.fee))}</td>
                            <td className="av-num">{z.freeFrom != null ? money(Number(z.freeFrom)) : "—"}</td>
                            <td className="av-small">{days(z)}</td>
                            <td>{z.active ? <Badge tone="success">{t("a.dz.shown")}</Badge> : <Badge>{t("a.dz.hidden")}</Badge>}</td>
                            <td><Button size="sm" variant={open === z.id ? "secondary" : "ghost"} aria-expanded={open === z.id} onClick={() => setOpen(open === z.id ? null : z.id)}>{open === z.id ? t("a.ng.hide") : t("a.dz.edit")}</Button></td>
                          </tr>
                          {open === z.id && <tr className="av-dztable__form"><td colSpan={6}>
                            <ZoneForm key={`${z.id}-${z.fee}-${z.name}-${z.active}-${z.daysMin}-${z.daysMax}-${z.freeFrom}-${z.kind}-${z.payOnReceipt}-${z.note}`} zone={z} onDone={done} />
                          </td></tr>}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </OwnersOnly>
    </>
  );
}
