import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { adminCreateTier, adminDeleteTier, adminGetPolicy, adminListTiers, adminUpdatePolicy, adminUpdateTier } from "../api/endpoints";
import type { PriceTier, PricingPolicy } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { useToast } from "../components/Toast";
import { OwnersOnly } from "./OwnersOnly";
import { useT } from "../i18n/I18n";

/** The owners' price rules: the minimum order, trusted customers, the "only N left" point, and the price ladder. */
export function AdminPricing() {
  const { t } = useT();
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.owners")}</span><h1>{t("a.nav.pricing")}</h1></div></header>
      <p className="av-lead">{t("a.pr.lead")}</p>
      <OwnersOnly><PolicyForm /><Ladder /></OwnersOnly>
    </>
  );
}

function PolicyForm() {
  const toast = useToast();
  const { t } = useT();
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
      setPolicy(saved); setForm(toForm(saved)); toast(t("a.pr.rulesSaved"));
    } catch (err) { setError(err instanceof ApiError ? err.message : t("a.err.save")); } finally { setBusy(false); }
  }

  if (!policy && !error) return <Skeleton height={200} />;
  const set = (k: keyof PricingPolicy) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <form className="av-card-form" onSubmit={save}>
      <h2 className="av-formtitle">{t("a.pr.rules")}</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="av-formgrid av-formgrid--4">
        <Input label={t("a.pr.min")} type="number" min={1} value={form.minOrderPairs} onChange={set("minOrderPairs")} hint={t("a.pr.minHint")} />
        <Input label={t("a.pr.trustedMin")} type="number" min={1} value={form.trustedMinOrderPairs} onChange={set("trustedMinOrderPairs")} hint={t("a.pr.trustedMinHint")} />
        <Input label={t("a.pr.trustedAfter")} type="number" min={1} value={form.trustedAfterOrders} onChange={set("trustedAfterOrders")} hint={t("a.pr.trustedAfterHint")} />
        <Input label={t("a.pr.fewLeft")} type="number" min={0} value={form.fewLeftThreshold} onChange={set("fewLeftThreshold")} hint={t("a.pr.fewLeftHint")} />
      </div>
      <div className="av-row"><Button type="submit" loading={busy}>{t("a.pr.saveRules")}</Button></div>
    </form>
  );
}

const toForm = (p: PricingPolicy) => ({
  minOrderPairs: String(p.minOrderPairs), trustedMinOrderPairs: String(p.trustedMinOrderPairs),
  trustedAfterOrders: String(p.trustedAfterOrders), fewLeftThreshold: String(p.fewLeftThreshold),
});

function Ladder() {
  const toast = useToast();
  const { t } = useT();
  const [tiers, setTiers] = useState<PriceTier[] | null>(null);
  const [pairs, setPairs] = useState("");
  const [pct, setPct] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reload = () => adminListTiers().then(setTiers).catch((e: Error) => setError(e.message));
  useEffect(() => { void reload(); }, []);

  async function run(work: () => Promise<unknown>, done: string) {
    setError(null);
    try { await work(); await reload(); toast(done); } catch (err) { setError(err instanceof ApiError ? err.message : t("a.err.save")); }
  }

  return (
    <section className="av-card-form" aria-labelledby="ladder-h">
      <h2 id="ladder-h" className="av-formtitle">{t("a.pr.ladder")}</h2>
      <p className="av-small">{t("a.pr.ladderLead")}</p>
      {error && <Alert tone="danger">{error}</Alert>}
      {!tiers && !error && <Skeleton height={120} />}
      {tiers && tiers.length === 0 && <p className="av-small">{t("a.pr.noSteps")}</p>}
      {tiers && tiers.length > 0 && (
        <ul className="av-termlist">
          {tiers.map((x) => <TierRow key={x.id} tier={x} onSave={(b) => run(() => adminUpdateTier(x.id, b), t("a.pr.stepSaved"))} onDelete={() => run(() => adminDeleteTier(x.id), t("a.pr.stepRemoved"))} />)}
        </ul>
      )}
      <form className="av-formgrid av-formgrid--4" onSubmit={(e) => { e.preventDefault(); void run(() => adminCreateTier({ minPairs: Number(pairs), discountPct: Number(pct) }), t("a.pr.stepAdded")).then(() => { setPairs(""); setPct(""); }); }}>
        <Input label={t("a.pr.from")} type="number" min={1} value={pairs} onChange={(e) => setPairs(e.target.value)} />
        <Input label={t("a.pr.discount")} type="number" min={0} max={90} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} />
        <div className="av-field"><span className="av-label">&nbsp;</span><Button type="submit" variant="secondary" disabled={!pairs || pct === ""}>{t("a.pr.addStep")}</Button></div>
      </form>
    </section>
  );
}

function TierRow({ tier, onSave, onDelete }: { tier: PriceTier; onSave: (b: { minPairs: number; discountPct: number }) => void; onDelete: () => void }) {
  const { t } = useT();
  const [pairs, setPairs] = useState(String(tier.minPairs));
  const [pct, setPct] = useState(String(Number(tier.discountPct)));
  const dirty = pairs !== String(tier.minPairs) || pct !== String(Number(tier.discountPct));
  return (
    <li className="av-term">
      <div className="av-formgrid av-formgrid--4" style={{ flex: 1 }}>
        <Input label={t("a.pr.from")} type="number" min={1} value={pairs} onChange={(e) => setPairs(e.target.value)} />
        <Input label={t("a.pr.discount")} type="number" min={0} max={90} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} />
      </div>
      <div className="av-row">
        <Button size="sm" disabled={!dirty} onClick={() => onSave({ minPairs: Number(pairs), discountPct: Number(pct) })}>{t("a.save")}</Button>
        <Button size="sm" variant="ghost" aria-label={t("a.pr.removeStep", { n: tier.minPairs })} onClick={onDelete}>{t("a.remove")}</Button>
      </div>
    </li>
  );
}
