import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSizeChart } from "../../api/endpoints";
import type { FamilyMemberInput, FamilyRole } from "../../api/types";
import { SockArt } from "../../brand/SockArt";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Toast";
import { withMessage } from "../../components/Contacts";
import { useAsync } from "../../hooks/useAsync";
import { useT } from "../../i18n/I18n";
import type { MessageKey } from "../../i18n/en";
import { useShopInfo } from "../useShopInfo";
import { ART, DEFAULT_SHOE, MAX_MEMBERS, MAX_PAIRS, ROLES, SHOES, sockSizeFor, useFamily } from "../family";


interface Member { id: number; role: FamilyRole; shoe: number; pairs: number; name?: string | null; birthday?: string | null }

/** The family saved in an account, in the planner's shape. */
const fromSaved = (list: FamilyMemberInput[]): Member[] =>
  list.map((m, i) => ({ id: i + 1, role: m.role, shoe: m.shoeSize, pairs: m.pairs, name: m.name, birthday: m.birthday }));

/**
 * A family set, planned in a minute: who the socks are for, their shoe size, how many pairs each. It answers the two
 * questions families ask at the stall (which size, and what the whole set costs per pair) and the list can be sent
 * to the shop in WhatsApp or Telegram, or taken to the catalogue. A signed-in customer starts from the family saved in
 * their account and can save the list back, so the sizes are worked out once.
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
  const family = useFamily();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const touched = useRef(false);
  // The saved family replaces the example, unless the visitor has already started on their own list.
  useEffect(() => {
    if (family.members && family.members.length > 0 && !touched.current) setMembers(fromSaved(family.members));
  }, [family.members]);
  const rows = chart.data?.rows ?? [];
  const total = members.reduce((s, m) => s + m.pairs, 0);
  const steps = [...tiers].sort((a, b) => a.minPairs - b.minPairs);
  const reached = [...steps].reverse().find((s) => total >= s.minPairs);
  const next = steps.find((s) => total < s.minPairs);
  const messenger = info?.contacts.find((c) => c.kind === "WHATSAPP") ?? info?.contacts.find((c) => c.kind === "TELEGRAM");

  const edit = (fn: (ms: Member[]) => Member[]) => { touched.current = true; setMembers(fn); };
  const update = (id: number, patch: Partial<Member>) => edit((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const add = (role: FamilyRole) => edit((ms) => (ms.length >= MAX_MEMBERS ? ms : [...ms, { id: Math.max(0, ...ms.map((m) => m.id)) + 1, role, shoe: DEFAULT_SHOE[role], pairs: 3 }]));

  async function keep() {
    setSaving(true);
    try {
      await family.save(members.map((m) => ({ name: m.name ?? null, role: m.role, shoeSize: m.shoe, pairs: m.pairs, birthday: m.birthday ?? null })));
      touched.current = false;
      toast(t("family.saved"));
    } catch {
      toast(t("family.saveError"), "danger");
    } finally { setSaving(false); }
  }

  const message = useMemo(() => {
    const lines = members.map((m) => {
      const size = sockSizeFor(rows, m.shoe, m.role);
      return `• ${m.name ? `${m.name} (${t(`family.${m.role}` as MessageKey)})` : t(`family.${m.role}` as MessageKey)}: ${t("family.shoe")} ${m.shoe}${size ? ` (${size.label} ${size.local.min}–${size.local.max})` : ""} × ${m.pairs}`;
    });
    return `${t("family.msgHello")}\n${lines.join("\n")}\n${t("family.msgTotal", { n: total })}`;
  }, [members, rows, total, t]);

  return (
    <section id="family" className="av-block" aria-labelledby="family-title" data-reveal>
      <div className="av-container">
        <div className="av-family">
          <div className="av-stack av-family__copy">
            <span className="av-eyebrow">{t("family.eyebrow")}</span>
            <h2 id="family-title">{t("family.title")}</h2>
            <p className="av-lead">{t("family.lead")}</p>
            <div className="av-family__add" role="group" aria-label={t("family.addLabel")}>
              {ROLES.map((r) => (
                <button key={r} type="button" className="av-family__chip" onClick={() => add(r)} disabled={members.length >= MAX_MEMBERS}>
                  <span aria-hidden="true">+</span> {t(`family.${r}` as MessageKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="av-family__sheet">
            <ul className="av-family__list">
              {members.map((m) => {
                const size = sockSizeFor(rows, m.shoe, m.role);
                const role = t(`family.${m.role}` as MessageKey);
                const who = m.name || role;
                return (
                  <li key={m.id} className="av-family__row">
                    <SockArt {...ART[m.role]} className="av-family__art" />
                    <div className="av-family__who">
                      <strong>{who}{m.name && <span className="av-family__role"> · {role}</span>}</strong>
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
                    <button type="button" className="av-family__remove" onClick={() => edit((ms) => ms.filter((x) => x.id !== m.id))} aria-label={t("family.remove", { who })} disabled={members.length <= 1}>×</button>
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
              {family.signedIn
                ? <Button variant="secondary" loading={saving} onClick={() => void keep()}>{t("family.save")}</Button>
                : null}
              {messenger && (
                <Button href={withMessage(messenger, message)} variant="secondary" target="_blank" rel="noopener noreferrer">
                  {t("family.send", { app: messenger.kind === "WHATSAPP" ? "WhatsApp" : "Telegram" })}
                </Button>
              )}
            </div>
            {!family.signedIn && <p className="av-small av-family__keep"><Link to="/login?next=%2Faccount">{t("family.signIn")}</Link></p>}
            {family.signedIn && <p className="av-small av-family__keep"><Link to="/account#family">{t("family.manage")}</Link></p>}
          </div>
        </div>
      </div>
    </section>
  );
}
