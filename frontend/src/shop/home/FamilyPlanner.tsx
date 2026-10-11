import { useId, useMemo, useState } from "react";
import { getSizeChart } from "../../api/endpoints";
import type { SizeRow } from "../../api/types";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { withMessage } from "../../components/Contacts";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { useShopInfo } from "../useShopInfo";

type Role = "dad" | "mom" | "son" | "daughter" | "grandpa" | "grandma" | "baby";
const ROLES: Role[] = ["dad", "mom", "son", "daughter", "grandpa", "grandma", "baby"];
const MALE = new Set<Role>(["dad", "son", "grandpa"]);
const DEFAULT_SHOE: Record<Role, number> = { dad: 42, mom: 38, son: 32, daughter: 30, grandpa: 42, grandma: 38, baby: 20 };
const ART: Record<Role, SockSpec> = {
  dad: { cut: "crew", main: C.navy, accent: C.gold, pattern: "argyle", second: C.cream },
  mom: { cut: "ankle", main: C.pink, accent: C.red, pattern: "hearts" },
  son: { cut: "crew", main: C.mint, accent: C.forest, pattern: "dino", second: C.white },
  daughter: { cut: "crew", main: C.lilac, accent: C.white, pattern: "dots" },
  grandpa: { cut: "crew", main: C.charcoal, accent: C.grey, pattern: "rib" },
  grandma: { cut: "crew", main: C.oat, accent: C.beige, fluffy: true },
  baby: { cut: "ankle", main: C.sky, accent: C.white, pattern: "dots", grip: true, second: C.coral },
};
const SHOES = Array.from({ length: 32 }, (_, i) => 16 + i);
const MAX_PAIRS = 30;

interface Member { id: number; role: Role; shoe: number; pairs: number }

/** The sock size for a shoe size, from the shop's own size chart. Overlapping sizes go to men's or women's by role. */
export function sockSizeFor(rows: SizeRow[], shoe: number, role: Role): SizeRow | undefined {
  const fits = rows.filter((r) => shoe >= r.local.min && shoe <= r.local.max);
  return MALE.has(role) ? fits[fits.length - 1] : fits[0];
}

/**
 * A family set, planned in a minute: who the socks are for, their shoe size, how many pairs each. It answers the two
 * questions families ask at the stall (which size, and what the whole set costs per pair) and the list can be sent
 * to the shop in WhatsApp or Telegram, or taken to the catalogue.
 */
export function FamilyPlanner({ minPairs, tiers }: { minPairs: number; tiers: Array<{ minPairs: number; discountPct: number }> }) {
  const { t, lang } = useT();
  const uid = useId();
  const info = useShopInfo();
  const chart = useAsync((signal) => getSizeChart(lang, signal), [lang]);
  const [members, setMembers] = useState<Member[]>([
    { id: 1, role: "dad", shoe: 42, pairs: 5 },
    { id: 2, role: "mom", shoe: 38, pairs: 5 },
    { id: 3, role: "son", shoe: 32, pairs: 5 },
  ]);
  const rows = chart.data?.rows ?? [];
  const total = members.reduce((s, m) => s + m.pairs, 0);
  const steps = [...tiers].sort((a, b) => a.minPairs - b.minPairs);
  const reached = [...steps].reverse().find((s) => total >= s.minPairs);
  const next = steps.find((s) => total < s.minPairs);
  const messenger = info?.contacts.find((c) => c.kind === "WHATSAPP") ?? info?.contacts.find((c) => c.kind === "TELEGRAM");

  const update = (id: number, patch: Partial<Member>) => setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const add = (role: Role) => setMembers((ms) => (ms.length >= 10 ? ms : [...ms, { id: Math.max(0, ...ms.map((m) => m.id)) + 1, role, shoe: DEFAULT_SHOE[role], pairs: 3 }]));

  const message = useMemo(() => {
    const lines = members.map((m) => {
      const size = sockSizeFor(rows, m.shoe, m.role);
      return `• ${t(`family.${m.role}` as MessageKey)}: ${t("family.shoe")} ${m.shoe}${size ? ` (${size.label} ${size.local.min}–${size.local.max})` : ""} × ${m.pairs}`;
    });
    return `${t("family.msgHello")}\n${lines.join("\n")}\n${t("family.msgTotal", { n: total })}`;
  }, [members, rows, total, t]);

  return (
    <section id="family" className="av-block" aria-labelledby="family-title" data-reveal>
      <div className="av-container">
        <div className="av-family">
          <div className="av-stack av-family__copy">
            <span className="av-eyebrow av-orn">{t("family.eyebrow")}</span>
            <h2 id="family-title">{t("family.title")}</h2>
            <p className="av-lead">{t("family.lead")}</p>
            <div className="av-family__add" role="group" aria-label={t("family.addLabel")}>
              {ROLES.map((r) => (
                <button key={r} type="button" className="av-family__chip" onClick={() => add(r)} disabled={members.length >= 10}>
                  <span aria-hidden="true">+</span> {t(`family.${r}` as MessageKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="av-family__sheet">
            <ul className="av-family__list">
              {members.map((m) => {
                const size = sockSizeFor(rows, m.shoe, m.role);
                const who = t(`family.${m.role}` as MessageKey);
                return (
                  <li key={m.id} className="av-family__row">
                    <SockArt {...ART[m.role]} className="av-family__art" />
                    <div className="av-family__who">
                      <strong>{who}</strong>
                      <span className="av-family__size">{size ? t("family.sockSize", { label: `${size.label} ${size.local.min}–${size.local.max}` }) : t("family.noSize")}</span>
                    </div>
                    <label className="av-family__field">
                      <span>{t("family.shoe")}</span>
                      <select className="av-select" value={m.shoe} onChange={(e) => update(m.id, { shoe: Number(e.target.value) })} aria-label={`${who}: ${t("family.shoe")}`}>
                        {SHOES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <div className="av-family__pairs" role="group" aria-label={`${who}: ${t("family.pairs")}`}>
                      <button type="button" onClick={() => update(m.id, { pairs: Math.max(1, m.pairs - 1) })} aria-label={t("family.less", { who })} disabled={m.pairs <= 1}>−</button>
                      <output aria-live="polite" id={`${uid}-${m.id}`}>{m.pairs}</output>
                      <button type="button" onClick={() => update(m.id, { pairs: Math.min(MAX_PAIRS, m.pairs + 1) })} aria-label={t("family.more", { who })} disabled={m.pairs >= MAX_PAIRS}>+</button>
                    </div>
                    <button type="button" className="av-family__remove" onClick={() => setMembers((ms) => ms.filter((x) => x.id !== m.id))} aria-label={t("family.remove", { who })} disabled={members.length <= 1}>×</button>
                  </li>
                );
              })}
            </ul>
            <div className="av-family__total" aria-live="polite">
              <div><strong className="av-num">{total}</strong> <span>{t("box.pairs")}</span></div>
              <span className="av-family__deal">
                {total < minPairs ? t("box.needMin", { n: minPairs - total, min: minPairs })
                  : reached ? t("box.off", { pct: Number(reached.discountPct) }) : t("ladder.base")}
              </span>
              {next && total >= minPairs && <span className="av-small">{t("box.next", { n: next.minPairs - total, pct: Number(next.discountPct) })}</span>}
            </div>
            <div className="av-row">
              <Button to="/shop">{t("family.shop")}</Button>
              {messenger && (
                <Button href={withMessage(messenger, message)} variant="secondary" target="_blank" rel="noopener noreferrer">
                  {t("family.send", { app: messenger.kind === "WHATSAPP" ? "WhatsApp" : "Telegram" })}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
