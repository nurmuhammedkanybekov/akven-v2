import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { negotiate } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { NegotiateResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n/I18n";
import { useMoney } from "../shop/useMoney";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { ChatBubble, NegotiationOffer } from "./Negotiation";

type Turn = { from: "customer"; text: string } | { from: "seller"; text: string; offer: NegotiateResponse; quantity: number };

interface Props {
  sku: string;
  quantity: number;
  disabled?: boolean;
  /** Called when the customer accepts an offer: the product page puts the item in the bag at that offer. */
  onAccept: (offer: NegotiateResponse, quantity: number) => void;
}

/**
 * The bargaining chat, in the customer's language. It is one conversation: each message carries the conversation's
 * id, so the assistant remembers what was said and offered. Every answer comes from the server already validated; the
 * browser never works out a discount itself. A different size or colour starts over, because an offer is for one item.
 */
export function NegotiationChat({ sku, quantity, disabled, onAccept }: Props) {
  const { session } = useAuth();
  const { t, lang } = useT();
  const { shown } = useMoney();
  const location = useLocation();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversation, setConversation] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { setTurns([]); setConversation(null); setError(null); }, [sku]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "nearest" }); }, [turns]);

  if (!session) {
    return (
      <section className="av-chat" aria-label={t("chat.aria")}>
        <h2 className="av-chat__title">{t("chat.title")}</h2>
        <p className="av-small"><Link to={`/login?next=${encodeURIComponent(location.pathname)}`}>{t("chat.signIn")}</Link> {t("chat.signInLead")}</p>
      </section>
    );
  }

  async function send(message: string) {
    const clean = message.trim();
    if (!clean || busy) return;
    setBusy(true); setError(null); setText("");
    setTurns((list) => [...list, { from: "customer", text: clean }]);
    try {
      const offer = await negotiate(sku, clean, quantity, conversation, lang, shown);
      setConversation(offer.sessionId);
      setTurns((list) => [...list, { from: "seller", text: offer.reply, offer, quantity }]);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? e.message : t("chat.failed"));
    } finally { setBusy(false); }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void send(text); };
  const lastOffer = [...turns].reverse().find((x): x is Extract<Turn, { from: "seller" }> => x.from === "seller" && x.offer.validatedDiscountPct > 0);
  const suggestions = [t("chat.s1"), t("chat.s2"), t("chat.s3")];

  return (
    <section className="av-chat" aria-label={t("chat.aria")}>
      <h2 className="av-chat__title">{t("chat.title")}</h2>
      <div className="av-chat__log" role="log" aria-live="polite" aria-label={t("chat.log")}>
        {turns.length === 0 && <ChatBubble from="seller">{t("chat.hello")}</ChatBubble>}
        {turns.map((x, i) => x.from === "customer"
          ? <ChatBubble key={i} from="customer">{x.text}</ChatBubble>
          : (
            <div key={i} className="av-chat__turn">
              <ChatBubble from="seller">{x.text}</ChatBubble>
              {x.offer.validatedDiscountPct > 0 && <NegotiationOffer listPrice={x.offer.listPrice} validatedDiscountPct={x.offer.validatedDiscountPct} offerPrice={x.offer.offerPrice} proposedDiscountPct={x.offer.proposedDiscountPct} />}
            </div>
          ))}
        {busy && <ChatBubble from="seller"><span className="av-muted">{t("chat.typing")}</span></ChatBubble>}
        <div ref={end} />
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      {turns.length === 0 && (
        <div className="av-row" role="group" aria-label={t("chat.suggestions")}>
          {suggestions.map((s) => <button key={s} type="button" className="av-chip" disabled={disabled || busy} onClick={() => void send(s)}>{s}</button>)}
        </div>
      )}
      <form className="av-chat__form" onSubmit={submit}>
        <label className="av-visually-hidden" htmlFor="negotiate-message">{t("chat.message")}</label>
        <input id="negotiate-message" className="av-input" value={text} maxLength={500} placeholder={t("chat.placeholder")} autoComplete="off"
               disabled={disabled || busy} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={disabled || busy || !text.trim()}>{t("chat.send")}</Button>
      </form>
      {lastOffer && (
        <Button block variant="accent" disabled={disabled} onClick={() => onAccept(lastOffer.offer, lastOffer.quantity)}>
          {t("chat.accept", { pairs: t(lastOffer.quantity === 1 ? "chat.onePair" : "chat.nPairs", { n: lastOffer.quantity }) })}
        </Button>
      )}
    </section>
  );
}
