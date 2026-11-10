import { ContactCards } from "../components/Contacts";
import { useShopInfo } from "../shop/useShopInfo";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";

/**
 * What the shop keeps about a customer and why, in plain words. It describes what the code actually does: hashed
 * passwords, no card details (the phone's wallet handles them), the bag and preferences only in the browser, no
 * tracking cookies, and an audit log of what the staff change.
 */
export function PrivacyPage() {
  const { t } = useT();
  const info = useShopInfo();
  return (
    <div className="av-page av-container av-privacy">
      <header className="av-stack">
        <span className="av-eyebrow">{t("pv.eyebrow")}</span>
        <h1>{t("pv.title")}</h1>
        <p className="av-lead">{t("pv.lead")}</p>
      </header>
      <ol className="av-privacy__list">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <li key={n} style={{ "--i": n } as React.CSSProperties}>
            <h2>{t(`pv.h${n}` as MessageKey)}</h2>
            <p>{t(`pv.b${n}` as MessageKey)}</p>
          </li>
        ))}
      </ol>
      <section className="av-stack" aria-labelledby="pv-contact">
        <h2 id="pv-contact">{t("pv.contact")}</h2>
        <ContactCards contacts={info?.contacts ?? []} />
      </section>
    </div>
  );
}
