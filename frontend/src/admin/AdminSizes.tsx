import { useState } from "react";
import { ApiError } from "../api/client";
import { adminCreateSize, adminDeleteSize, adminUpdateSize, getSizeChart, type SizeRowInput } from "../api/endpoints";
import type { SizeRow } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { OwnersOnly } from "./OwnersOnly";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";

const FIELDS: Array<[keyof SizeRowInput, MessageKey]> = [
  ["footCmMin", "a.sz.footMin"], ["footCmMax", "a.sz.footMax"], ["krMmMin", "a.sz.krMin"], ["krMmMax", "a.sz.krMax"],
  ["localMin", "a.sz.localMin"], ["localMax", "a.sz.localMax"], ["euMin", "a.sz.euMin"], ["euMax", "a.sz.euMax"],
];

const fromRow = (r: SizeRow, position: number): SizeRowInput => ({
  label: r.label, footCmMin: r.footCm.min, footCmMax: r.footCm.max, krMmMin: r.krMm.min, krMmMax: r.krMm.max,
  localMin: r.local.min, localMax: r.local.max, euMin: r.eu.min, euMax: r.eu.max, usLabel: r.us, position,
});
const blank = (position: number): SizeRowInput => ({ label: "", footCmMin: 0, footCmMax: 0, krMmMin: 0, krMmMax: 0, localMin: 0, localMax: 0, euMin: 0, euMax: 0, usLabel: "", position });

/** The size chart the shop shows on /sizes and in the size finder. Check the values against the Korean labels. */
export function AdminSizes() {
  const toast = useToast();
  const { t } = useT();
  const chart = useAsync((signal) => getSizeChart("en", signal), []);
  const [error, setError] = useState<string | null>(null);
  async function run(work: () => Promise<unknown>, done: string) {
    setError(null);
    try { await work(); chart.reload(); toast(done); } catch (e) { setError(e instanceof ApiError ? e.message : t("a.err.save")); }
  }
  const rows = chart.data?.rows ?? [];
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.owners")}</span><h1>{t("a.nav.sizes")}</h1></div></header>
      <OwnersOnly>
        {error && <Alert tone="danger">{error}</Alert>}
        {chart.loading && !chart.data && <Skeleton height={200} />}
        {rows.map((r, i) => (
          <SizeForm key={r.id} initial={fromRow(r, i)} title={r.label}
                    onSave={(b) => run(() => adminUpdateSize(r.id, b), t("a.saved"))} onDelete={() => run(() => adminDeleteSize(r.id), t("a.sz.removed"))} />
        ))}
        {chart.data && <SizeForm key={`new-${rows.length}`} initial={blank(rows.length)} title={t("a.sz.add")} onSave={(b) => run(() => adminCreateSize(b), t("a.added"))} />}
      </OwnersOnly>
    </>
  );
}

function SizeForm({ initial, title, onSave, onDelete }: { initial: SizeRowInput; title: string; onSave: (b: SizeRowInput) => void; onDelete?: () => void }) {
  const { t } = useT();
  const [v, setV] = useState<Record<keyof SizeRowInput, string>>(() =>
    Object.fromEntries(Object.entries(initial).map(([k, x]) => [k, onDelete || typeof x === "string" ? String(x) : ""])) as Record<keyof SizeRowInput, string>);
  const set = (k: keyof SizeRowInput) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const body = (): SizeRowInput => ({
    ...(Object.fromEntries(FIELDS.map(([k]) => [k, Number(v[k])])) as unknown as SizeRowInput),
    label: v.label.trim(), usLabel: v.usLabel.trim(), position: Number(v.position) || 0,
  });
  return (
    <form className="av-card-form" onSubmit={(e) => { e.preventDefault(); onSave(body()); }} aria-label={title}>
      <h2 className="av-formtitle">{title}</h2>
      <div className="av-formgrid av-formgrid--4">
        <Input label={t("a.name")} value={v.label} placeholder={t("a.cat.WOMEN")} onChange={set("label")} />
        <Input label="US" value={v.usLabel} placeholder="W 5.5–9.5" onChange={set("usLabel")} />
        {FIELDS.map(([k, label]) => <Input key={k} label={t(label)} type="number" step="0.5" value={v[k]} onChange={set(k)} />)}
      </div>
      <div className="av-row">
        <Button type="submit" disabled={!v.label.trim()}>{onDelete ? t("a.save") : t("a.sz.addBtn")}</Button>
        {onDelete && <Button variant="ghost" onClick={onDelete}>{t("a.remove")}</Button>}
      </div>
    </form>
  );
}
