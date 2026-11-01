import { useState, type FormEvent } from "react";
import { adminCreateDeliveryZone, adminDeleteDeliveryZone, adminDeliveryZones, adminUpdateDeliveryZone } from "../api/endpoints";
import type { Country, DeliveryZone, DeliveryZoneInput } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Field";
import { Switch } from "../components/Switch";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { OwnersOnly } from "./OwnersOnly";

const COUNTRIES: Country[] = ["KG", "KZ", "UZ", "RU"];
const EMPTY: DeliveryZoneInput = { country: "KG", name: "", fee: 0, freeFrom: null, daysMin: null, daysMax: null, active: true, position: 0 };

type Draft = { country: Country; name: string; fee: string; freeFrom: string; daysMin: string; daysMax: string; active: boolean; position: string };
const toDraft = (z: DeliveryZoneInput): Draft => ({
  country: z.country, name: z.name, fee: String(z.fee), freeFrom: z.freeFrom == null ? "" : String(z.freeFrom),
  daysMin: z.daysMin == null ? "" : String(z.daysMin), daysMax: z.daysMax == null ? "" : String(z.daysMax), active: z.active, position: String(z.position),
});
const fromDraft = (d: Draft): DeliveryZoneInput => ({
  country: d.country, name: d.name.trim(), fee: Number(d.fee || 0), freeFrom: d.freeFrom.trim() ? Number(d.freeFrom) : null,
  daysMin: d.daysMin.trim() ? Number(d.daysMin) : null, daysMax: d.daysMax.trim() ? Number(d.daysMax) : null, active: d.active, position: Number(d.position || 0),
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
      {zone && !zone.active && <Badge>{t("a.dz.hidden")}</Badge>}
      <div className="av-dzone__grid">
        <Select label={t("a.dz.country")} value={d.country} onChange={set("country")}>
          {COUNTRIES.map((c) => <option key={c} value={c}>{t(`country.${c}` as MessageKey)}</option>)}
        </Select>
        <Input label={t("a.dz.name")} required minLength={2} maxLength={60} value={d.name} onChange={set("name")} />
        <Input label={t("a.dz.fee")} type="number" min={0} max={1000} step="0.01" required value={d.fee} onChange={set("fee")} />
        <Input label={t("a.dz.freeFrom")} type="number" min={0.01} step="0.01" value={d.freeFrom} onChange={set("freeFrom")} />
        <Input label={t("a.dz.daysMin")} type="number" min={0} max={60} value={d.daysMin} onChange={set("daysMin")} />
        <Input label={t("a.dz.daysMax")} type="number" min={0} max={60} value={d.daysMax} onChange={set("daysMax")} />
      </div>
      <Switch checked={d.active} onChange={(active) => setD({ ...d, active })} label={t("a.dz.active")} />
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-row">
        <Button type="submit" size="sm" loading={busy}>{zone ? t("a.dz.save") : t("a.dz.add")}</Button>
        {zone && <Button type="button" size="sm" variant="ghost" onClick={() => void remove()} disabled={busy}>{t("a.dz.delete")}</Button>}
      </div>
    </form>
  );
}

/** Delivery areas: where the shop delivers, the fee, the free-from amount and the days. Owners only. */
export function AdminDelivery() {
  const { t } = useT();
  const list = useAsync(() => adminDeliveryZones(), []);
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.owners")}</span><h1>{t("a.nav.delivery")}</h1></div></header>
      <p className="av-lead">{t("a.dz.lead")}</p>
      <OwnersOnly>
        {list.loading && !list.data && <Skeleton height={200} />}
        {list.error && <Alert tone="danger">{list.error.message}</Alert>}
        <div className="av-dzones">
          {(list.data ?? []).map((z) => <ZoneForm key={`${z.id}-${z.fee}-${z.name}-${z.active}-${z.daysMin}-${z.daysMax}-${z.freeFrom}`} zone={z} onDone={list.reload} />)}
          <h2>{t("a.dz.new")}</h2>
          <ZoneForm zone={null} onDone={list.reload} />
        </div>
      </OwnersOnly>
    </>
  );
}
