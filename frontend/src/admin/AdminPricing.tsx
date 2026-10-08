import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { adminCreateTier, adminDeleteTier, adminGetPolicy, adminListTiers, adminUpdatePolicy, adminUpdateTier } from "../api/endpoints";
import type { PriceTier, PricingPolicy } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { useToast } from "../components/Toast";
import { OwnersOnly } from "./OwnersOnly";

/** The owners' price rules: the minimum order, trusted customers, the "only N left" point, and the price ladder. */
export function AdminPricing() {
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">Owners</span><h1>Pricing</h1></div></header>
      <p className="av-lead">Customers can mix any socks. The minimum and the ladder count pairs across the whole order, and no step can go below a sock's own discount limit.</p>
      <OwnersOnly><PolicyForm /><Ladder /></OwnersOnly>
    </>
  );
}

function PolicyForm() {
  const toast = useToast();
  const [policy, setPolicy] = useState<PricingPolicy | null>(null);
  const [form, setForm] = useState<Record<keyof PricingPolicy, string>>({ minOrderPairs: "", trustedMinOrderPairs: "", trustedAfterOrders: "", fewLeftThreshold: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminGetPolicy().then((p) => { setPolicy(p); setForm(toForm(p)); }).catch((e: Error) => setError(e.message));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const saved = await adminUpdatePolicy({
        minOrderPairs: Number(form.minOrderPairs), trustedMinOrderPairs: Number(form.trustedMinOrderPairs),
        trustedAfterOrders: Number(form.trustedAfterOrders), fewLeftThreshold: Number(form.fewLeftThreshold),
      });
      setPolicy(saved); setForm(toForm(saved)); toast("Order rules saved");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Could not save. Try again."); } finally { setBusy(false); }
  }

  if (!policy && !error) return <Skeleton height={200} />;
  const set = (k: keyof PricingPolicy) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <form className="av-card-form" onSubmit={save}>
      <h2 className="av-formtitle">Order rules</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-formgrid av-formgrid--4">
        <Input label="Minimum order (pairs)" type="number" min={1} value={form.minOrderPairs} onChange={set("minOrderPairs")} hint="Counted across all socks in the bag." />
        <Input label="Minimum for trusted customers" type="number" min={1} value={form.trustedMinOrderPairs} onChange={set("trustedMinOrderPairs")} hint="Cannot be higher than the minimum." />
        <Input label="Trusted after paid orders" type="number" min={1} value={form.trustedAfterOrders} onChange={set("trustedAfterOrders")} hint="Or mark a customer as trusted yourself." />
        <Input label={'"Only N left" from'} type="number" min={0} value={form.fewLeftThreshold} onChange={set("fewLeftThreshold")} hint="Units left before the shop says so." />
      </div>
      <div className="av-row"><Button type="submit" loading={busy}>Save order rules</Button></div>
    </form>
  );
}

const toForm = (p: PricingPolicy) => ({
  minOrderPairs: String(p.minOrderPairs), trustedMinOrderPairs: String(p.trustedMinOrderPairs),
  trustedAfterOrders: String(p.trustedAfterOrders), fewLeftThreshold: String(p.fewLeftThreshold),
});

function Ladder() {
  const toast = useToast();
  const [tiers, setTiers] = useState<PriceTier[] | null>(null);
  const [pairs, setPairs] = useState("");
  const [pct, setPct] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reload = () => adminListTiers().then(setTiers).catch((e: Error) => setError(e.message));
  useEffect(() => { void reload(); }, []);

  async function run(work: () => Promise<unknown>, done: string) {
    setError(null);
    try { await work(); await reload(); toast(done); } catch (err) { setError(err instanceof ApiError ? err.message : "Could not save. Try again."); }
  }

  return (
    <section className="av-card-form" aria-labelledby="ladder-h">
      <h2 id="ladder-h" className="av-formtitle">Price ladder</h2>
      <p className="av-small">Each step gives a discount on every pair once the order reaches that many pairs. Steps can be added, changed and removed at any time.</p>
      {error && <Alert tone="danger">{error}</Alert>}
      {!tiers && !error && <Skeleton height={120} />}
      {tiers && tiers.length === 0 && <p className="av-small">No steps yet: every order pays the shop price.</p>}
      {tiers && tiers.length > 0 && (
        <ul className="av-termlist">
          {tiers.map((t) => <TierRow key={t.id} tier={t} onSave={(b) => run(() => adminUpdateTier(t.id, b), "Step saved")} onDelete={() => run(() => adminDeleteTier(t.id), "Step removed")} />)}
        </ul>
      )}
      <form className="av-formgrid av-formgrid--4" onSubmit={(e) => { e.preventDefault(); void run(() => adminCreateTier({ minPairs: Number(pairs), discountPct: Number(pct) }), "Step added").then(() => { setPairs(""); setPct(""); }); }}>
        <Input label="From (pairs)" type="number" min={1} value={pairs} onChange={(e) => setPairs(e.target.value)} />
        <Input label="Discount (%)" type="number" min={0} max={90} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} />
        <div className="av-field"><span className="av-label">&nbsp;</span><Button type="submit" variant="secondary" disabled={!pairs || pct === ""}>Add a step</Button></div>
      </form>
    </section>
  );
}

function TierRow({ tier, onSave, onDelete }: { tier: PriceTier; onSave: (b: { minPairs: number; discountPct: number }) => void; onDelete: () => void }) {
  const [pairs, setPairs] = useState(String(tier.minPairs));
  const [pct, setPct] = useState(String(Number(tier.discountPct)));
  const dirty = pairs !== String(tier.minPairs) || pct !== String(Number(tier.discountPct));
  return (
    <li className="av-term">
      <div className="av-formgrid av-formgrid--4" style={{ flex: 1 }}>
        <Input label="From (pairs)" type="number" min={1} value={pairs} onChange={(e) => setPairs(e.target.value)} />
        <Input label="Discount (%)" type="number" min={0} max={90} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} />
      </div>
      <div className="av-row">
        <Button size="sm" disabled={!dirty} onClick={() => onSave({ minPairs: Number(pairs), discountPct: Number(pct) })}>Save</Button>
        <Button size="sm" variant="ghost" aria-label={`Remove the step from ${tier.minPairs} pairs`} onClick={onDelete}>Remove</Button>
      </div>
    </li>
  );
}
