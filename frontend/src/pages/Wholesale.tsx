import { useState, type FormEvent } from "react";
import { CaseArt } from "../shop/wholesale/CaseArt";
import { CaseBuilder } from "../shop/wholesale/CaseBuilder";
import { listProducts, sendWholesaleRequest } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { WholesaleContactKind, WholesaleReceived } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { ContactCards, withMessage } from "../components/Contacts";
import { Input, Select, Textarea } from "../components/Field";
import { ArrowIcon } from "../components/icons";
import { ProductCard } from "../components/ProductCard";
import { SOCK_COLOURS as C, SockArt, type SockSpec } from "../brand/SockArt";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { useShopInfo } from "../shop/useShopInfo";

type Kind = "wholesale" | "gifts";
const CONTACT_KINDS: WholesaleContactKind[] = ["WHATSAPP", "TELEGRAM", "PHONE", "EMAIL"];
/** The same checks as the server, so a mistake is shown in the visitor's language before anything is sent. */
const PHONE = /^\+?[0-9][0-9 ()-]{6,22}$/, TELEGRAM = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/, EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
export function contactProblem(kind: WholesaleContactKind, raw: string): MessageKey | null {
  const v = raw.trim().replace(/\s+/g, " ");
  const phone = PHONE.test(v) && v.replace(/\D/g, "").length >= 7;
  if (kind === "EMAIL") return EMAIL.test(v) ? null : "quote.badEmail";
  if (kind === "TELEGRAM") return TELEGRAM.test(v) || PHONE.test(v) ? null : "quote.badTg";
  return phone ? null : "quote.badPhone";
}
const HINT: Record<WholesaleContactKind, MessageKey> = { WHATSAPP: "quote.phHint", PHONE: "quote.phHint", TELEGRAM: "quote.tgHint", EMAIL: "quote.emHint" };

/** Three socks for each kind of customer: a shop's mix, a team's one colour in every size, a company's gift. */
const WHO: Array<{ n: 1 | 2 | 3; socks: SockSpec[] }> = [
  { n: 1, socks: [
    { cut: "crew", main: C.navy, accent: C.gold, pattern: "rib" },
    { cut: "ankle", main: C.rose, accent: C.cream, pattern: "hearts", second: C.cream },
    { cut: "crew", main: C.mustard, accent: C.navy, pattern: "dino", second: C.forest },
  ] },
  { n: 2, socks: [0, 1, 2].map(() => ({ cut: "crew", main: C.white, accent: C.indigo, pattern: "bands", second: C.indigo }) as SockSpec) },
  { n: 3, socks: [
    { cut: "crew", main: C.brick, accent: C.gold, pattern: "snow", second: C.cream },
    { cut: "crew", main: C.forest, accent: C.gold, pattern: "argyle", second: C.cream },
    { cut: "crew", main: C.cream, accent: C.brick, pattern: "oimo", second: C.navy, heel: true },
  ] },
];

/**
 * For shops, market stalls, teams and companies: the family's biggest customers. The page shows the stall the way a
 * buyer meets it (an open case, the facts that matter, how a case is made), lets a shop build its mix, and keeps the
 * request in the shop's own inbox, with a reference number. Wholesale prices depend on the dollar rate, the factory
 * price, the quantity and the delivery, so they are never published; the family answers each request with a price.
 */
export function WholesalePage() {
  const { t, lang } = useT();
  const info = useShopInfo();
  const contacts = info?.contacts ?? [];
  const writable = contacts.filter((c) => c.kind === "WHATSAPP" || c.kind === "TELEGRAM" || c.kind === "EMAIL");
  const boxes = useAsync((signal) => listProducts({ category: "BUNDLES", pageSize: 4, sort: "newest" }, signal), []);
  const [kind, setKind] = useState<Kind>(() => (typeof window !== "undefined" && window.location.hash === "#gifts" ? "gifts" : "wholesale"));
  const [form, setForm] = useState({ name: "", city: "", pairs: "200", note: "", contact: "", website: "" });
  const [contactKind, setContactKind] = useState<WholesaleContactKind>("WHATSAPP");
  const [mix, setMix] = useState<{ text: string; pairs: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [received, setReceived] = useState<WholesaleReceived | null>(null);
  const [messenger, setMessenger] = useState(false);

  const message = [
    t(kind === "gifts" ? "quote.msgGifts" : "quote.msgWholesale"),
    received && `${t("quote.ref")}: ${received.reference}`,
    form.name && `${t("quote.name")}: ${form.name}`,
    form.city && `${t("quote.city")}: ${form.city}`,
    `${t("quote.pairs")}: ${mix ? mix.pairs : form.pairs}`,
    mix && `${t("case.mixLine")}: ${mix.text}`,
    form.note && `${t("quote.note")}: ${form.note}`,
  ].filter(Boolean).join("\n");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = contactProblem(contactKind, form.contact);
    if (problem) { setContactError(t(problem)); return; }
    setSending(true); setError(null);
    try {
      const pairs = mix ? mix.pairs : parseInt(form.pairs, 10) || 1;
      setReceived(await sendWholesaleRequest({
        kind: kind === "gifts" ? "GIFTS" : "WHOLESALE", company: form.name, city: form.city || null, contactKind,
        contact: form.contact, pairs: Math.min(pairs, 100000), mix: mix?.text.slice(0, 4000) ?? null, note: form.note || null, website: form.website, lang,
      }));
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 500 ? err.message : t("quote.err"));
    } finally {
      setSending(false);
    }
  }
  const change = () => { setMessenger(false); setError(null); setContactError(null); };
  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setForm({ ...form, [k]: e.target.value }); change(); },
  });
  function startAgain() {
    setReceived(null); setMix(null); setMessenger(false);
    setForm({ name: "", city: "", pairs: "200", note: "", contact: "", website: "" });
  }

  const sendButtons = (
    <div className="av-row">
      {writable.map((c) => (
        <Button key={c.id} href={withMessage(c, message)} variant="secondary" target={c.kind === "EMAIL" ? undefined : "_blank"} rel="noopener noreferrer">
          {t("quote.via", { app: c.label ?? (c.kind === "WHATSAPP" ? "WhatsApp" : c.kind === "TELEGRAM" ? "Telegram" : "Email") })}
        </Button>
      ))}
      {writable.length === 0 && <p className="av-small">{t("visit.noContacts")}</p>}
    </div>
  );

  return (
    <div className="av-page av-whole3">
      <section className="av-container">
        <div className="av-whole3__hero">
          <div className="av-whole3__copy">
            <span className="av-hand">{t("whole.eyebrow")}</span>
            <h1>{t("whole.title")}</h1>
            <p className="av-lead">{t("whole.pageLead")}</p>
            <div className="av-row">
              <Button href="#quote" variant="accent" size="lg">{t("quote.cta")}</Button>
              <Button href="#case-title" variant="secondary" size="lg" className="av-btn--onnavy">{t("case.title")}</Button>
            </div>
          </div>
          <CaseArt />
          <dl className="av-whole3__facts">
            <div><dt>2018</dt><dd>{t("whole.f1")}</dd></div>
            <div><dt>10–12</dt><dd>{t("whole.f2")}</dd></div>
            <div><dt>~240</dt><dd>{t("whole.f3")}</dd></div>
            <div><dt>4</dt><dd>{t("whole.f4")}</dd></div>
          </dl>
        </div>
      </section>

      <section className="av-container av-block" aria-labelledby="who-title" data-reveal>
        <header className="av-block__head">
          <span className="av-hand">{t("whole.whoEyebrow")}</span>
          <h2 id="who-title">{t("whole.whoTitle")}</h2>
        </header>
        <ul className="av-whole3__who">
          {WHO.map(({ n, socks }, i) => (
            <li key={n} style={{ "--i": i } as React.CSSProperties}>
              <span className="av-whole3__fan" aria-hidden="true">
                {socks.map((s, k) => <SockArt key={k} {...s} frame="crew" style={{ "--k": k } as React.CSSProperties} />)}
              </span>
              <strong>{t(`whole.who${n}` as MessageKey)}</strong>
              <span>{t(`whole.who${n}s` as MessageKey)}</span>
              {n === 3 && <a className="av-whole3__more" href="#gifts" onClick={() => setKind("gifts")}>{t("whole.who3cta")} <ArrowIcon /></a>}
            </li>
          ))}
        </ul>
      </section>

      <section className="av-whole3__way av-block" aria-labelledby="way-title" data-reveal>
        <div className="av-container">
          <span className="av-hand">{t("whole.wayEyebrow")}</span>
          <h2 id="way-title">{t("whole.wayTitle")}</h2>
          <ol className="av-whole3__steps">
            {[1, 2, 3, 4].map((n, i) => (
              <li key={n} style={{ "--i": i } as React.CSSProperties}>
                <span className="av-kraft">0{n}</span>
                <strong>{t(`whole.way${n}` as MessageKey)}</strong>
                <span>{t(`whole.way${n}s` as MessageKey)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="av-container av-block" data-reveal>
        <CaseBuilder onUse={(text, pairs) => {
          setMix({ text, pairs }); setKind("wholesale"); change();
          document.getElementById("quote")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }} />
      </section>

      <section id="quote" className="av-container av-block" aria-labelledby="quote-title" data-reveal>
        <div className="av-quote">
          <div className="av-stack">
            <span className="av-hand">{t("quote.eyebrow")}</span>
            <h2 id="quote-title">{t("quote.title")}</h2>
            <p className="av-lead">{t("quote.lead")}</p>
            <ol className="av-numbered">
              <li><b>1</b><span>{t("quote.step1")}</span></li>
              <li><b>2</b><span>{t("quote.step2")}</span></li>
              <li><b>3</b><span>{t("quote.step3")}</span></li>
            </ol>
          </div>
          {received ? (
            <div className="av-quote__form av-quote__done av-stack" aria-live="polite">
              <span className="av-quote__stamp">{received.reference}</span>
              <h3>{t("quote.sent", { ref: received.reference })}</h3>
              <p>{t("quote.sentS")}</p>
              {sendButtons}
              <button type="button" className="av-linkbtn" onClick={startAgain}>{t("quote.another")}</button>
            </div>
          ) : (
            <form className="av-quote__form av-stack" onSubmit={submit}>
              <div className="av-chips" role="group" aria-label={t("quote.kind")}>
                <button type="button" aria-pressed={kind === "wholesale"} onClick={() => { setKind("wholesale"); change(); }}>{t("a.wh.stock")}</button>
                <button type="button" aria-pressed={kind === "gifts"} onClick={() => { setKind("gifts"); change(); }}>{t("foot.gifts")}</button>
              </div>
              <Input label={t("quote.name")} autoComplete="organization" required minLength={2} maxLength={80} {...field("name")} />
              <Input label={t("quote.city")} autoComplete="address-level2" maxLength={60} {...field("city")} />
              <fieldset className="av-quote__contact">
                <legend className="av-label">{t("quote.contactKind")}</legend>
                <div className="av-chips">
                  {CONTACT_KINDS.map((k) => (
                    <button key={k} type="button" aria-pressed={contactKind === k} onClick={() => { setContactKind(k); change(); }}>{t(`quote.ck${k}` as MessageKey)}</button>
                  ))}
                </div>
                <Input label={t("quote.contact")} required maxLength={80} placeholder={t(HINT[contactKind])} error={contactError ?? undefined}
                  type={contactKind === "EMAIL" ? "email" : contactKind === "TELEGRAM" ? "text" : "tel"}
                  autoComplete={contactKind === "EMAIL" ? "email" : contactKind === "TELEGRAM" ? "off" : "tel"} {...field("contact")} />
              </fieldset>
              {mix ? (
                <div className="av-casebuild__chosen">
                  <span className="av-label">{t("case.mixLine")}</span>
                  <p><strong>{t("bag.pairs", { n: mix.pairs })}</strong></p>
                  <ul className="av-casebuild__mixlist">{mix.text.split("\n").map((line) => <li key={line}>{line}</li>)}</ul>
                  <button type="button" className="av-linkbtn" onClick={() => { setMix(null); change(); }}>{t("case.clear")}</button>
                </div>
              ) : (
                <Select label={t("quote.pairs")} {...field("pairs")}>
                  {["50", "100", "200", "500", "1000", "2000"].map((v) => <option key={v} value={v}>{v === "2000" ? "2000+" : v}</option>)}
                </Select>
              )}
              <Textarea label={t("quote.note")} maxLength={500} {...field("note")} />
              {/* A trap for bots: hidden from people and from screen readers, never filled in by a person. */}
              <div className="av-visually-hidden" aria-hidden="true">
                <label>Website<input tabIndex={-1} autoComplete="off" {...field("website")} /></label>
              </div>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button type="submit" size="lg" block loading={sending}>{t("quote.send")}</Button>
              <button type="button" className="av-linkbtn" aria-expanded={messenger} onClick={() => setMessenger((m) => !m)}>{t("quote.orMessenger")}</button>
              {messenger && (
                <div className="av-quote__send" aria-live="polite">
                  <p className="av-small">{t("quote.ready")}</p>
                  <pre className="av-quote__preview">{message}</pre>
                  {sendButtons}
                </div>
              )}
            </form>
          )}
        </div>
      </section>

      <section id="gifts" className="av-container av-block" aria-labelledby="gifts-title" data-reveal>
        <header className="av-block__head">
          <span className="av-hand">{t("gift.eyebrow")}</span>
          <h2 id="gifts-title">{t("quote.giftsTitle")}</h2>
          <p className="av-lead">{t("quote.giftsLead")}</p>
        </header>
        {boxes.data && boxes.data.items.length > 0 && (
          <div className="av-grid-products">
            {boxes.data.items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={((i + 1) % 6) + 1} />)}
          </div>
        )}
      </section>

      <section className="av-container av-block av-whole3__faq" aria-labelledby="faq-title" data-reveal>
        <header>
          <span className="av-hand">{t("faq.eyebrow")}</span>
          <h2 id="faq-title">{t("faq.title")}</h2>
        </header>
        <div>
          {[1, 2, 3, 4, 5].map((n) => (
            <details key={n}>
              <summary>{t(`faq.q${n}` as MessageKey)}</summary>
              <p>{t(`faq.a${n}` as MessageKey)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="av-container av-block" aria-labelledby="whole-contacts" data-reveal>
        <h2 id="whole-contacts" className="av-whole2__h">{t("contact.title")}</h2>
        <ContactCards contacts={contacts} />
      </section>
    </div>
  );
}
