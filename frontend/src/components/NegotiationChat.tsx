import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { negotiate } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { NegotiateResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { ChatBubble, NegotiationOffer } from "./Negotiation";

type Turn = { from: "customer"; text: string } | { from: "seller"; text: string; offer: NegotiateResponse };

interface Props {
  sku: string;
  quantity: number;
  disabled?: boolean;
  /** Called when the customer accepts an offer: the product page puts the item in the bag at that offer. */
  onAccept: (offer: NegotiateResponse) => void;
}

const SUGGESTIONS = ["Can I get a better price?", "I'll take 5 pairs, what can you do?", "Could you do 10% off?"];

/**
 * The bargaining chat. Every message goes to the server, which returns an already validated offer. The browser never
 * works out a discount itself. Starting over (a different size or colour) clears the chat, because an offer is for
 * one exact item.
 */
export function NegotiationChat({ sku, quantity, disabled, onAccept }: Props) {
  const { session } = useAuth();
  const location = useLocation();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { setTurns([]); setError(null); }, [sku]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "nearest" }); }, [turns]);

  if (!session) {
    return (
      <section className="av-chat" aria-label="Negotiate the price">
        <h2 className="av-chat__title">Want a better price?</h2>
        <p className="av-small"><Link to={`/login?next=${encodeURIComponent(location.pathname)}`}>Sign in</Link> to chat with our assistant about the price.</p>
      </section>
    );
  }

  async function send(message: string) {
    const clean = message.trim();
    if (!clean || busy) return;
    setBusy(true); setError(null); setText("");
    setTurns((t) => [...t, { from: "customer", text: clean }]);
    try {
      const offer = await negotiate(sku, clean, quantity);
      setTurns((t) => [...t, { from: "seller", text: offer.reply, offer }]);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? e.message : "The assistant could not answer just now. Please try again.");
    } finally { setBusy(false); }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void send(text); };
  const lastOffer = [...turns].reverse().find((t): t is Extract<Turn, { from: "seller" }> => t.from === "seller" && t.offer.validatedDiscountPct > 0);

  return (
    <section className="av-chat" aria-label="Negotiate the price">
      <h2 className="av-chat__title">Want a better price?</h2>
      <div className="av-chat__log" role="log" aria-live="polite" aria-label="Conversation">
        {turns.length === 0 && <ChatBubble from="seller">Hello! Tell me how many pairs you need or what price you have in mind, and I will see what I can do.</ChatBubble>}
        {turns.map((t, i) => t.from === "customer"
          ? <ChatBubble key={i} from="customer">{t.text}</ChatBubble>
          : (
            <div key={i} className="av-chat__turn">
              <ChatBubble from="seller">{t.text}</ChatBubble>
              {t.offer.validatedDiscountPct > 0 && <NegotiationOffer listPrice={t.offer.listPrice} validatedDiscountPct={t.offer.validatedDiscountPct} offerPrice={t.offer.offerPrice} proposedDiscountPct={t.offer.proposedDiscountPct} />}
            </div>
          ))}
        {busy && <ChatBubble from="seller"><span className="av-muted">Typing…</span></ChatBubble>}
        <div ref={end} />
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      {turns.length === 0 && (
        <div className="av-row" role="group" aria-label="Suggestions">
          {SUGGESTIONS.map((s) => <button key={s} type="button" className="av-chip" disabled={disabled || busy} onClick={() => void send(s)}>{s}</button>)}
        </div>
      )}
      <form className="av-chat__form" onSubmit={submit}>
        <label className="av-visually-hidden" htmlFor="negotiate-message">Your message</label>
        <input id="negotiate-message" className="av-input" value={text} maxLength={500} placeholder="Type your message" autoComplete="off"
               disabled={disabled || busy} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={disabled || busy || !text.trim()}>Send</Button>
      </form>
      {lastOffer && (
        <Button block variant="accent" disabled={disabled} onClick={() => onAccept(lastOffer.offer)}>
          Add to bag at this price
        </Button>
      )}
    </section>
  );
}
