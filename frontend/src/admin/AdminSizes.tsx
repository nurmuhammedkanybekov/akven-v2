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

const FIELDS: Array<[keyof SizeRowInput, string]> = [
  ["footCmMin", "Foot from (cm)"], ["footCmMax", "Foot to (cm)"], ["krMmMin", "Korean from (mm)"], ["krMmMax", "Korean to (mm)"],
  ["localMin", "RU / KG from"], ["localMax", "RU / KG to"], ["euMin", "EU from"], ["euMax", "EU to"],
];

const fromRow = (r: SizeRow, position: number): SizeRowInput => ({
  label: r.label, footCmMin: r.footCm.min, footCmMax: r.footCm.max, krMmMin: r.krMm.min, krMmMax: r.krMm.max,
  localMin: r.local.min, localMax: r.local.max, euMin: r.eu.min, euMax: r.eu.max, usLabel: r.us, position,
});
const blank = (position: number): SizeRowInput => ({ label: "", footCmMin: 0, footCmMax: 0, krMmMin: 0, krMmMax: 0, localMin: 0, localMax: 0, euMin: 0, euMax: 0, usLabel: "", position });

/** The size chart the shop shows on /sizes and in the size finder. Check the values against the Korean labels. */
export function AdminSizes() {
  const toast = useToast();
  const chart = useAsync((signal) => getSizeChart("en", signal), []);
  const [error, setError] = useState<string | null>(null);
  async function run(work: () => Promise<unknown>, done: string) {
    setError(null);
    try { await work(); chart.reload(); toast(done); } catch (e) { setError(e instanceof ApiError ? e.message : "Could not save. Try again."); }
  }
  const rows = chart.data?.rows ?? [];
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">Owners</span><h1>Size chart</h1></div></header>
      <OwnersOnly>
        {error && <Alert tone="danger">{error}</Alert>}
        {chart.loading && !chart.data && <Skeleton height={200} />}
        {rows.map((r, i) => (
          <SizeForm key={r.id} initial={fromRow(r, i)} title={r.label}
                    onSave={(b) => run(() => adminUpdateSize(r.id, b), "Size saved")} onDelete={() => run(() => adminDeleteSize(r.id), "Size removed")} />
        ))}
        {chart.data && <SizeForm key={`new-${rows.length}`} initial={blank(rows.length)} title="Add a size" onSave={(b) => run(() => adminCreateSize(b), "Size added")} />}
      </OwnersOnly>
    </>
  );
}

function SizeForm({ initial, title, onSave, onDelete }: { initial: SizeRowInput; title: string; onSave: (b: SizeRowInput) => void; onDelete?: () => void }) {
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
        <Input label="Name" value={v.label} placeholder="Women" onChange={set("label")} />
        <Input label="US" value={v.usLabel} placeholder="W 5.5–9.5" onChange={set("usLabel")} />
        {FIELDS.map(([k, label]) => <Input key={k} label={label} type="number" step="0.5" value={v[k]} onChange={set(k)} />)}
      </div>
      <div className="av-row">
        <Button type="submit" disabled={!v.label.trim()}>{onDelete ? "Save" : "Add size"}</Button>
        {onDelete && <Button variant="ghost" onClick={onDelete}>Remove</Button>}
      </div>
    </form>
  );
}
