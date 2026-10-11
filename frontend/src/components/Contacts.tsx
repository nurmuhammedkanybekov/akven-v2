import type { ContactKind, ShopContact } from "../api/types";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";

/** Simple one-colour icons for each way to reach the shop (drawn here, so no tracking scripts or icon fonts). */
export function ContactIcon({ kind }: { kind: ContactKind }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "INSTAGRAM":
      return <svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" /></svg>;
    case "TELEGRAM":
      return <svg {...common}><path d="M21 4 3 11.2l6 2.2L19 7l-7.6 8.1.3 4.9 3-3.5 4 3.1Z" /></svg>;
    case "WHATSAPP":
      return <svg {...common}><path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z" /><path d="M9 8.8c0 3.1 3 6.2 6.2 6.2l1.2-1.6-2-1-1 .8a5 5 0 0 1-2.6-2.6l.8-1-1-2Z" /></svg>;
    case "FACEBOOK":
      return <svg {...common}><path d="M14.5 21v-7.2h2.6l.4-3H14.5V9c0-.9.3-1.6 1.6-1.6h1.6V4.7a20 20 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.1H8.6v3h2.7V21" /></svg>;
    case "PHONE":
      return <svg {...common}><path d="M6.6 3.5h2.8l1.4 4.2-2 1.4a11 11 0 0 0 6 6l1.4-2 4.2 1.4v2.8A2.2 2.2 0 0 1 18.2 19.5C10.4 19 5 13.6 4.5 5.8a2.2 2.2 0 0 1 2.1-2.3Z" /></svg>;
    case "EMAIL":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;
  }
}

/** What a person reads: @name for social handles, the number or address otherwise. */
export function contactValue(c: ShopContact): string {
  return c.kind === "INSTAGRAM" || c.kind === "TELEGRAM" ? `@${c.value}` : c.value;
}

/**
 * A link that opens the chat with a message already written, where the messenger allows it (WhatsApp and Telegram).
 * The text is the customer's own (their bag or request), so nothing is sent until they press send themselves.
 */
export function withMessage(c: ShopContact, text: string): string {
  if (c.kind === "WHATSAPP" || c.kind === "TELEGRAM") return `${c.url}?text=${encodeURIComponent(text)}`;
  if (c.kind === "EMAIL") return `${c.url}?body=${encodeURIComponent(text)}`;
  return c.url;
}

const VERB: Record<ContactKind, MessageKey> = {
  INSTAGRAM: "contact.instagram", TELEGRAM: "contact.telegram", WHATSAPP: "contact.whatsapp",
  FACEBOOK: "contact.facebook", PHONE: "contact.phone", EMAIL: "contact.email",
};

/** The contacts as large cards that lift and light up in each channel's colour, one after another as they appear. */
export function ContactCards({ contacts, compact = false }: { contacts: ShopContact[]; compact?: boolean }) {
  const { t } = useT();
  if (contacts.length === 0) return <p className="av-small">{t("visit.noContacts")}</p>;
  return (
    <ul className={`av-contact-cards${compact ? " av-contact-cards--compact" : ""}`}>
      {contacts.map((c, i) => (
        <li key={c.id} style={{ "--i": i } as React.CSSProperties}>
          <a href={c.url} className={`av-contact av-contact--${c.kind.toLowerCase()}`}
             target={c.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            <span className="av-contact__icon"><ContactIcon kind={c.kind} /></span>
            <span className="av-contact__text">
              <strong>{c.label ?? t(VERB[c.kind])}</strong>
              <span>{contactValue(c)}</span>
            </span>
            <span className="av-contact__go" aria-hidden="true">→</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
