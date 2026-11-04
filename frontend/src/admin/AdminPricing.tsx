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
import { toSom } from "../shop/useMoney";

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
  const [form, setForm] = useState<Record<keyof PricingPolicy, string>>({ minOrderPairs: "", trustedMinOrderPairs: "", trustedAfterOrders: "", fewLeftThreshold: "", somPerUsd: "", somRounding: "10", rubPerUsd: "", rubRounding: "10" });
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
        somPerUsd: Number(form.somPerUsd), somRounding: Number(form.somRounding),
        rubPerUsd: Number(form.rubPerUsd), rubRounding: Number(form.rubRounding),
      });
      setPolicy(saved); setForm(toForm(saved)); toast(t("a.pr.rulesSaved"));
    } catch (err) { setError(err instanceof ApiError ? err.message : t("a.err.save")); } finally { setBusy(false); }
  }

  if (!policy && !error) return <Skeleton height={200} />;
  const set = (k: keyof PricingPolicy) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const dirty = policy !== null && JSON.stringify(form) !== JSON.stringify(toForm(policy));
  const som = Number(form.somPerUsd), rub = Number(form.rubPerUsd);
  const EXAMPLES = [3.5, 7.5, 12, 34];
  return (
    <form className="av-pricing" onSubmit={save}>
      {error && <Alert tone="danger">{error}</Alert>}
      <section className="av-card-form" aria-labelledby="rules-h">
        <div className="av-pricing__head"><h2 id="rules-h" className="av-formtitle">{t("a.pr.rules")}</h2><p className="av-small av-muted">{t("a.pr.rulesLead")}</p></div>
        <div className="av-pricing__rules">
          <Input label={t("a.pr.min")} type="number" min={1} value={form.minOrderPairs} onChange={set("minOrderPairs")} hint={t("a.pr.minHint")} />
          <Input label={t("a.pr.trustedMin")} type="number" min={1} value={form.trustedMinOrderPairs} onChange={set("trustedMinOrderPairs")} hint={t("a.pr.trustedMinHint")} />
          <Input label={t("a.pr.trustedAfter")} type="number" min={1} value={form.trustedAfterOrders} onChange={set("trustedAfterOrders")} hint={t("a.pr.trustedAfterHint")} />
          <Input label={t("a.pr.fewLeft")} type="number" min={0} value={form.fewLeftThreshold} onChange={set("fewLeftThreshold")} hint={t("a.pr.fewLeftHint")} />
        </div>
      </section>
      <section className="av-card-form" aria-labelledby="money-h">
        <div className="av-pricing__head"><h2 id="money-h" className="av-formtitle">{t("a.pr.money")}</h2><p className="av-small av-muted">{t("a.pr.somLead")}</p></div>
        <div className="av-pricing__money">
          <fieldset className="av-pricing__cur">
            <legend>{t("a.pr.som")}</legend>
            <Input label={t("a.pr.somRate")} type="number" min={0.01} step="0.01" value={form.somPerUsd} onChange={set("somPerUsd")} hint={t("a.pr.somRateHint")} />
            <label className="av-field">
              <span className="av-label">{t("a.pr.somRound")}</span>
              <select className="av-select" value={form.somRounding} onChange={(e) => setForm({ ...form, somRounding: e.target.value })}>
                {["1", "5", "10", "50", "100"].map((n) => <option key={n} value={n}>{t("a.pr.somRoundTo", { n })}</option>)}
              </select>
            </label>
          </fieldset>
          <fieldset className="av-pricing__cur">
            <legend>{t("a.pr.rub")}</legend>
            <Input label={t("a.pr.rubRate")} type="number" min={0.01} step="0.01" value={form.rubPerUsd} onChange={set("rubPerUsd")} hint={t("a.pr.somRateHint")} />
            <label className="av-field">
              <span className="av-label">{t("a.pr.rubRound")}</span>
              <select className="av-select" value={form.rubRounding} onChange={(e) => setForm({ ...form, rubRounding: e.target.value })}>
                {["1", "5", "10", "50", "100"].map((n) => <option key={n} value={n}>{n} ₽</option>)}
              </select>
            </label>
          </fieldset>
          <div className="av-pricing__examples" aria-live="polite">
            <span className="av-label">{t("a.pr.somExample")}</span>
            <table className="av-table av-table--tight">
              <thead><tr><th scope="col">$</th><th scope="col">{t("cur.somShort")}</th><th scope="col">₽</th></tr></thead>
              <tbody>{EXAMPLES.map((usd) => (
                <tr key={usd}><td className="av-num">${usd.toFixed(2)}</td>
                  <td className="av-num">{som > 0 ? toSom(usd, som, Number(form.somRounding)).toLocaleString("ru-RU") : "—"}</td>
                  <td className="av-num">{rub > 0 ? toSom(usd, rub, Number(form.rubRounding)).toLocaleString("ru-RU") : "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </section>
      <div className={`av-savebar${dirty ? " is-dirty" : ""}`}>
        <span className="av-small">{dirty ? t("a.pr.unsaved") : t("a.pr.allSaved")}</span>
        <Button type="submit" loading={busy} disabled={!dirty}>{t("a.pr.saveRules")}</Button>
      </div>
    </form>
  );
}

const toForm = (p: PricingPolicy) => ({
  minOrderPairs: String(p.minOrderPairs), trustedMinOrderPairs: String(p.trustedMinOrderPairs),
  trustedAfterOrders: String(p.trustedAfterOrders), fewLeftThreshold: String(p.fewLeftThreshold),
  somPerUsd: String(Number(p.somPerUsd)), somRounding: String(p.somRounding),
  rubPerUsd: String(Number(p.rubPerUsd)), rubRounding: String(p.rubRounding),
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

  const sorted = [...(tiers ?? [])].sort((a, b) => a.minPairs - b.minPairs);
  const maxPct = Math.max(1, ...sorted.map((x) => Number(x.discountPct)));
  return (
    <section className="av-card-form" aria-labelledby="ladder-h">
      <div className="av-pricing__head"><h2 id="ladder-h" className="av-formtitle">{t("a.pr.ladder")}</h2><p className="av-small av-muted">{t("a.pr.ladderLead")}</p></div>
      {error && <Alert tone="danger">{error}</Alert>}
      {!tiers && !error && <Skeleton height={120} />}
      {sorted.length > 0 && (
        <div className="av-stairs" aria-hidden="true">
          {sorted.map((x) => (
            <div key={x.id} className="av-stairs__step" style={{ height: `${28 + (Number(x.discountPct) / maxPct) * 72}%` }}>
              <strong>−{Number(x.discountPct)}%</strong><span>{t("a.pr.fromPairs", { n: x.minPairs })}</span>
            </div>
          ))}
        </div>
      )}
      <div className="av-tablewrap">
        <table className="av-table av-ladder">
          <thead><tr><th scope="col">{t("a.pr.from")}</th><th scope="col">{t("a.pr.discount")}</th><th scope="col">{t("a.pr.example")}</th><th scope="col"><span className="av-visually-hidden">{t("a.cu.actions")}</span></th></tr></thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={4} className="av-small">{t("a.pr.noSteps")}</td></tr>}
            {sorted.map((x) => <TierRow key={`${x.id}-${x.minPairs}-${x.discountPct}`} tier={x} onSave={(b) => run(() => adminUpdateTier(x.id, b), t("a.pr.stepSaved"))} onDelete={() => run(() => adminDeleteTier(x.id), t("a.pr.stepRemoved"))} />)}
            <tr className="av-ladder__new">
              <td><input className="av-input" type="number" min={1} value={pairs} placeholder="200" aria-label={t("a.pr.from")} onChange={(e) => setPairs(e.target.value)} /></td>
              <td><input className="av-input" type="number" min={0} max={90} step="0.5" value={pct} placeholder="12" aria-label={t("a.pr.discount")} onChange={(e) => setPct(e.target.value)} /></td>
              <td className="av-small av-muted">{pairs && pct !== "" ? t("a.pr.exampleText", { price: (7.5 * (100 - Number(pct)) / 100).toFixed(2) }) : t("a.pr.newStep")}</td>
              <td><Button size="sm" variant="secondary" disabled={!pairs || pct === ""}
                onClick={() => void run(() => adminCreateTier({ minPairs: Number(pairs), discountPct: Number(pct) }), t("a.pr.stepAdded")).then(() => { setPairs(""); setPct(""); })}>{t("a.pr.addStep")}</Button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TierRow({ tier, onSave, onDelete }: { tier: PriceTier; onSave: (b: { minPairs: number; discountPct: number }) => void; onDelete: () => void }) {
  const { t } = useT();
  const [pairs, setPairs] = useState(String(tier.minPairs));
  const [pct, setPct] = useState(String(Number(tier.discountPct)));
  const dirty = pairs !== String(tier.minPairs) || pct !== String(Number(tier.discountPct));
  return (
    <tr className={dirty ? "is-dirty" : undefined}>
      <td><input className="av-input" type="number" min={1} value={pairs} aria-label={t("a.pr.from")} onChange={(e) => setPairs(e.target.value)} /></td>
      <td><input className="av-input" type="number" min={0} max={90} step="0.5" value={pct} aria-label={t("a.pr.discount")} onChange={(e) => setPct(e.target.value)} /></td>
      <td className="av-small">{t("a.pr.exampleText", { price: (7.5 * (100 - Number(pct || 0)) / 100).toFixed(2) })}</td>
      <td className="av-admin__rowactions">
        {dirty ? <Button size="sm" onClick={() => onSave({ minPairs: Number(pairs), discountPct: Number(pct) })}>{t("a.save")}</Button>
          : <span className="av-small av-muted av-saved">✓ {t("a.pr.saved")}</span>}
        <Button size="sm" variant="ghost" aria-label={t("a.pr.removeStep", { n: tier.minPairs })} onClick={() => { if (window.confirm(t("a.pr.removeQ", { n: tier.minPairs }))) onDelete(); }}>{t("a.remove")}</Button>
      </td>
    </tr>
  );
}
