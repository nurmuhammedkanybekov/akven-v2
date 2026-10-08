import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { findSize } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { SizeSystem } from "../api/types";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { Button } from "./Button";

const SYSTEMS: SizeSystem[] = ["LOCAL", "EU", "FOOT_CM", "KR_MM"];

/**
 * "I know my shoe size": turns a size in any system into the sock size. Customers in Kyrgyzstan and Russia start
 * with the local sizes, English readers with EU sizes.
 */
export function SizeFinder() {
  const { t, lang } = useT();
  const [system, setSystem] = useState<SizeSystem>(lang === "en" ? "EU" : "LOCAL");
  const [size, setSize] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(size.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    setBusy(true);
    try {
      const m = await findSize(system, n);
      setResult(t("finder.result", { labels: m.labels.join(" / ") }));
    } catch (err) {
      setResult(err instanceof ApiError ? err.message : t("pdp.loadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="av-finder">
      <summary>{t("finder.open")}</summary>
      <form className="av-finder__form" onSubmit={submit}>
        <label className="av-field">
          <span className="av-label">{t("finder.system")}</span>
          <select className="av-select" value={system} onChange={(e) => { setSystem(e.target.value as SizeSystem); setResult(null); }}>
            {SYSTEMS.map((s) => <option key={s} value={s}>{t(`finder.${s}` as MessageKey)}</option>)}
          </select>
        </label>
        <label className="av-field">
          <span className="av-label">{t("finder.size")}</span>
          <input className="av-input" inputMode="decimal" value={size} onChange={(e) => { setSize(e.target.value); setResult(null); }} />
        </label>
        <Button type="submit" variant="secondary" loading={busy}>{t("finder.go")}</Button>
      </form>
      {result && <p className="av-finder__result" role="status">{result}</p>}
      <Link to="/sizes" className="av-small">{t("finder.chart")}</Link>
    </details>
  );
}
