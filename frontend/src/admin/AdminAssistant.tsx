import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { adminAssistantStatus, adminListProducts, adminLiveEvaluation, adminSetAssistantMode, adminTryAssistant } from "../api/endpoints";
import type { AssistantMode, AssistantTry, EvaluationReport } from "../api/types";
import { Alert, Skeleton } from "../components/Alert";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { LANGS, useT, type Lang } from "../i18n/I18n";
import { formatPrice } from "../lib/format";
import { ComparisonReport } from "./AdminDashboard";
import { SuperAdminOnly } from "./SuperAdminOnly";

/**
 * The super admin's controls for the price assistant: which one answers the chat (the AI or the rules), whether the AI
 * has its key, a test message that is not stored, and the comparison against the live model. Whatever answers, the
 * shop's limit is applied afterwards, so switching is always safe.
 */
export function AdminAssistant() {
  const { t } = useT();
  return (
    <>
      <header className="av-admin__head"><div><span className="av-eyebrow">{t("a.group.system")}</span><h1>{t("a.nav.assistant")}</h1></div></header>
      <p className="av-lead">{t("a.as.lead")}</p>
      <SuperAdminOnly><Status /><TryIt /><LiveRun /></SuperAdminOnly>
    </>
  );
}

function Status() {
  const { t } = useT();
  const toast = useToast();
  const status = useAsync(() => adminAssistantStatus(), []);
  const [busy, setBusy] = useState(false);
  if (status.loading && !status.data) return <Skeleton height={160} />;
  if (status.error || !status.data) return <Alert tone="danger">{status.error?.message ?? t("a.err.generic")}</Alert>;
  const s = status.data;

  async function choose(mode: AssistantMode) {
    setBusy(true);
    try { await adminSetAssistantMode(mode); status.reload(); toast(t(mode === "ai" ? "a.as.nowAi" : "a.as.nowRules")); }
    catch (e) { toast(e instanceof ApiError ? e.message : t("a.err.save"), "danger"); } finally { setBusy(false); }
  }
  const answers = Object.entries(s.answersLast7Days);
  return (
    <section className="av-card-form" aria-labelledby="as-status-h">
      <h2 id="as-status-h" className="av-formtitle">{t("a.as.who")}</h2>
      <div className="av-tabs av-tabs--inline" role="group" aria-label={t("a.as.who")}>
        <button type="button" className="av-tabbtn" aria-pressed={s.mode === "ai"} disabled={busy || !s.aiConfigured} onClick={() => void choose("ai")}>{t("a.as.ai")}</button>
        <button type="button" className="av-tabbtn" aria-pressed={s.mode === "rules"} disabled={busy} onClick={() => void choose("rules")}>{t("a.as.rules")}</button>
      </div>
      <p className="av-small">{t(s.mode === "ai" ? "a.as.aiExplain" : "a.as.rulesExplain")}</p>
      {!s.aiConfigured && <Alert>{t("a.as.noKey")}</Alert>}
      <dl className="av-dl">
        <div><dt>{t("a.as.model")}</dt><dd>{s.model} <Badge tone={s.aiConfigured ? "success" : "danger"}>{t(s.aiConfigured ? "a.as.keySet" : "a.as.keyMissing")}</Badge></dd></div>
        <div><dt>{t("a.as.where")}</dt><dd>{s.endpointHost ?? "—"}</dd></div>
        <div><dt>{t("a.as.week")}</dt><dd>{answers.length === 0 ? "—" : answers.map(([k, n]) => `${t(k === "llm" ? "a.ng.byAi" : k === "rules-fallback" ? "a.ng.byFallback" : "a.ng.byRules")}: ${n}`).join(" · ")}</dd></div>
      </dl>
    </section>
  );
}

function TryIt() {
  const { t, lang } = useT();
  const products = useAsync(() => adminListProducts({ status: "active", pageSize: 100 }), []);
  const [sku, setSku] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [language, setLanguage] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantTry | null>(null);
  const options = (products.data?.items ?? []).flatMap((p) => p.variants.filter((v) => v.active).map((v) => ({ sku: v.sku, label: `${p.name} · ${[v.color, v.size].filter(Boolean).join(", ")} · ${formatPrice(v.price)}` })));
  const chosen = sku || options[0]?.sku || "";

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try { setResult(await adminTryAssistant({ sku: chosen, message: message.trim(), quantity: Number(quantity) || 1, language })); }
    catch (err) { setError(err instanceof ApiError ? err.message : t("a.err.generic")); } finally { setBusy(false); }
  }

  return (
    <form className="av-card-form" onSubmit={send} aria-labelledby="as-try-h">
      <h2 id="as-try-h" className="av-formtitle">{t("a.as.try")}</h2>
      <p className="av-small">{t("a.as.tryLead")}</p>
      <div className="av-formgrid av-formgrid--4">
        <label className="av-field" htmlFor="try-sku">
          <span className="av-label">{t("a.as.sock")}</span>
          <select id="try-sku" className="av-select" value={chosen} onChange={(e) => setSku(e.target.value)}>
            {options.map((o) => <option key={o.sku} value={o.sku}>{o.label}</option>)}
          </select>
        </label>
        <Input label={t("a.db.pairs")} type="number" min={1} max={999} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <label className="av-field" htmlFor="try-lang">
          <span className="av-label">{t("lang.label")}</span>
          <select id="try-lang" className="av-select" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
      </div>
      <Input label={t("a.as.message")} value={message} maxLength={500} placeholder={t("a.as.messageEg")} onChange={(e) => setMessage(e.target.value)} />
      <div className="av-row"><Button type="submit" loading={busy} disabled={!chosen || !message.trim()}>{t("a.as.send")}</Button></div>
      {error && <Alert tone="danger">{error}</Alert>}
      {result && (
        <div className="av-turns" role="status">
          <p><strong>{t("a.ng.shop")}:</strong> {result.reply}</p>
          <p className="av-small av-muted">
            <Badge tone={result.assistant === "llm" ? "ai" : "neutral"}>{t(result.assistant === "llm" ? "a.ng.byAi" : result.assistant === "rules-fallback" ? "a.ng.byFallback" : "a.ng.byRules")}</Badge>{" "}
            {t("a.as.result", { proposed: result.proposedPct, validated: result.validatedPct, price: formatPrice(result.offerPrice), ms: result.millis })}
          </p>
        </div>
      )}
    </form>
  );
}

function LiveRun() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  async function run() {
    setBusy(true); setError(null);
    try { setReport(await adminLiveEvaluation()); } catch (e) { setError(e instanceof ApiError ? e.message : t("a.err.generic")); } finally { setBusy(false); }
  }
  return (
    <>
      <section className="av-card-form" aria-labelledby="as-live-h">
        <h2 id="as-live-h" className="av-formtitle">{t("a.as.live")}</h2>
        <p className="av-small">{t("a.as.liveLead")}</p>
        <div className="av-row"><Button variant="secondary" loading={busy} onClick={run}>{t("a.as.liveRun")}</Button></div>
        {busy && <p className="av-small" role="status">{t("a.as.liveWait")}</p>}
        {error && <Alert tone="danger">{error}</Alert>}
      </section>
      {report && <ComparisonReport report={report} />}
    </>
  );
}
