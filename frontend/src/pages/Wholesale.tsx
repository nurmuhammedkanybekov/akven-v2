import { useState, type FormEvent } from "react";
import { listProducts } from "../api/endpoints";
import { Button } from "../components/Button";
import { ContactCards, withMessage } from "../components/Contacts";
import { Input, Select } from "../components/Field";
import { StackIcon, StoreIcon, TruckIcon } from "../components/icons";
import { ProductCard } from "../components/ProductCard";
import { SOCK_COLOURS as C, SockArt } from "../brand/SockArt";
import { useAsync } from "../hooks/useAsync";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { useShopInfo } from "../shop/useShopInfo";

type Kind = "wholesale" | "gifts";

/**
 * For shops, resellers and companies. Wholesale prices depend on the dollar rate, transport and the factory price, so
 * they are never published. Instead the page explains how ordering by the pack and the case works, and the customer
 * writes a short request that opens in the owners' WhatsApp, Telegram or email, already filled in. Nothing is stored
 * and nothing is sent until the customer presses send in their own app.
 */
export function WholesalePage() {
  const { t } = useT();
  const info = useShopInfo();
  const contacts = info?.contacts ?? [];
  const writable = contacts.filter((c) => c.kind === "WHATSAPP" || c.kind === "TELEGRAM" || c.kind === "EMAIL");
  const boxes = useAsync((signal) => listProducts({ category: "BUNDLES", pageSize: 4, sort: "newest" }, signal), []);
  const [kind, setKind] = useState<Kind>(() => (typeof window !== "undefined" && window.location.hash === "#gifts" ? "gifts" : "wholesale"));
  const [form, setForm] = useState({ name: "", city: "", pairs: "200", note: "" });
  const [ready, setReady] = useState(false);

  const message = [
    t(kind === "gifts" ? "quote.msgGifts" : "quote.msgWholesale"),
    form.name && `${t("quote.name")}: ${form.name}`,
    form.city && `${t("quote.city")}: ${form.city}`,
    `${t("quote.pairs")}: ${form.pairs}`,
    form.note && `${t("quote.note")}: ${form.note}`,
  ].filter(Boolean).join("\n");

  function submit(e: FormEvent) { e.preventDefault(); setReady(true); }
  const field = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setForm({ ...form, [k]: e.target.value }); setReady(false); } });

  return (
    <div className="av-page av-whole2">
      <section className="av-container">
        <div className="av-deep av-whole2__hero">
          <div className="av-whole2__stack" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => <SockArt key={i} cut="crew" main={[C.navy, C.charcoal, C.cream, C.navy, C.charcoal][i]} accent={C.gold} pattern={i === 2 ? "oimo" : "rib"} second={C.gold} heel={i === 2} style={{ "--k": i } as React.CSSProperties} />)}
          </div>
          <span className="av-eyebrow av-orn">{t("whole.eyebrow")}</span>
          <h1>{t("whole.title")}</h1>
          <p className="av-lead">{t("whole.pageLead")}</p>
          <div className="av-row">
            <Button href="#quote" variant="accent" size="lg">{t("quote.cta")}</Button>
            <Button href="#gifts" variant="secondary" size="lg" className="av-btn--onnavy" onClick={() => setKind("gifts")}>{t("foot.gifts")}</Button>
          </div>
        </div>
      </section>

      <section className="av-container av-block" data-reveal>
        <ul className="av-whole2__cards">
          {([["packs", <StackIcon key="i" />], ["cases", <StoreIcon key="i" />], ["price", <TruckIcon key="i" />]] as const).map(([k, icon], i) => (
            <li key={k} style={{ "--i": i } as React.CSSProperties}>
              <span className="av-whole2__icon">{icon}</span>
              <strong>{t(`whole.${k}` as MessageKey)}</strong>
              <span>{t(`whole.${k}S` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="gifts" className="av-container av-block" aria-labelledby="gifts-title" data-reveal>
        <header className="av-block__head">
          <span className="av-eyebrow av-orn">{t("gift.eyebrow")}</span>
          <h2 id="gifts-title">{t("quote.giftsTitle")}</h2>
          <p className="av-lead">{t("quote.giftsLead")}</p>
        </header>
        {boxes.data && boxes.data.items.length > 0 && (
          <div className="av-grid-products">
            {boxes.data.items.map((p, i) => <ProductCard key={p.slug} product={p} to={`/products/${p.slug}`} tint={((i + 1) % 6) + 1} />)}
          </div>
        )}
      </section>

      <section id="quote" className="av-container av-block" aria-labelledby="quote-title" data-reveal>
        <div className="av-quote">
          <div className="av-stack">
            <span className="av-eyebrow av-orn">{t("quote.eyebrow")}</span>
            <h2 id="quote-title">{t("quote.title")}</h2>
            <p className="av-lead">{t("quote.lead")}</p>
            <ol className="av-numbered">
              <li><b>1</b><span>{t("quote.step1")}</span></li>
              <li><b>2</b><span>{t("quote.step2")}</span></li>
              <li><b>3</b><span>{t("quote.step3")}</span></li>
            </ol>
          </div>
          <form className="av-quote__form av-stack" onSubmit={submit}>
            <div className="av-chips" role="group" aria-label={t("quote.kind")}>
              <button type="button" aria-pressed={kind === "wholesale"} onClick={() => { setKind("wholesale"); setReady(false); }}>{t("nav.wholesale")}</button>
              <button type="button" aria-pressed={kind === "gifts"} onClick={() => { setKind("gifts"); setReady(false); }}>{t("foot.gifts")}</button>
            </div>
            <Input label={t("quote.name")} autoComplete="organization" {...field("name")} />
            <Input label={t("quote.city")} autoComplete="address-level2" {...field("city")} />
            <Select label={t("quote.pairs")} {...field("pairs")}>
              {["50", "100", "200", "500", "1000", "2000+"].map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
            <Input label={t("quote.note")} {...field("note")} />
            <Button type="submit" size="lg" block>{t("quote.prepare")}</Button>
            {ready && (
              <div className="av-quote__send" aria-live="polite">
                <p className="av-small">{t("quote.ready")}</p>
                <pre className="av-quote__preview">{message}</pre>
                <div className="av-row">
                  {writable.map((c) => (
                    <Button key={c.id} href={withMessage(c, message)} variant="secondary" target={c.kind === "EMAIL" ? undefined : "_blank"} rel="noopener noreferrer">
                      {t("quote.via", { app: c.label ?? (c.kind === "WHATSAPP" ? "WhatsApp" : c.kind === "TELEGRAM" ? "Telegram" : "Email") })}
                    </Button>
                  ))}
                  {writable.length === 0 && <p className="av-small">{t("visit.noContacts")}</p>}
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="av-container av-block" aria-labelledby="whole-contacts" data-reveal>
        <h2 id="whole-contacts" className="av-whole2__h">{t("contact.title")}</h2>
        <ContactCards contacts={contacts} />
      </section>
    </div>
  );
}
