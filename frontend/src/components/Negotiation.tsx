import type { ReactNode } from "react";
import { discountedPrice } from "../lib/format";
import { useMoney } from "../shop/useMoney";
import { useT } from "../i18n/I18n";
import { Badge } from "./Badge";
import { CheckIcon } from "./icons";

export function ChatBubble({ from, children }: { from: "customer" | "seller"; children: ReactNode }) {
  const { t } = useT();
  return (
    <div className={`av-bubble av-bubble--${from}`}>
      {from === "seller" && <span className="av-eyebrow av-bubble__who">{t("chat.who")}</span>}
      {children}
    </div>
  );
}

interface OfferProps {
  listPrice: number;
  /** The discount the pricing policy approved. This is the only number that ever reaches a cart. */
  validatedDiscountPct: number;
  /** What the language model suggested. Only passed in the demo/defence mode, never to real customers. */
  proposedDiscountPct?: number;
  /** The price the server worked out. When given it is shown as it is, never recalculated in the browser. */
  offerPrice?: number;
}

/**
 * The thesis in one component. The model PROPOSES (purple), the pricing policy VALIDATES (green) and only
 * the validated figure sets the price. When the model over-asks, the difference is shown on purpose.
 */
export function NegotiationOffer({ listPrice, validatedDiscountPct, proposedDiscountPct, offerPrice }: OfferProps) {
  const { t } = useT();
  const { money } = useMoney();
  const offer = offerPrice ?? discountedPrice(listPrice, validatedDiscountPct);
  const clamped = proposedDiscountPct !== undefined && proposedDiscountPct > validatedDiscountPct;
  return (
    <div className="av-offer" aria-label={t("chat.offer")}>
      <div className="av-offer__row">
        <span className="av-offer__now">{money(offer)}</span>
        <span className="av-offer__was">{money(listPrice)}</span>
        <Badge tone="success">−{validatedDiscountPct}%</Badge>
      </div>
      {proposedDiscountPct !== undefined && (
        <div className="av-offer__proof">
          <span className="av-offer__proposed"><Badge tone="ai">{t("chat.proposed")}</Badge> {t("chat.suggested", { pct: proposedDiscountPct })}</span>
          <span className="av-offer__validated">
            <CheckIcon /> <strong>{t("chat.validated")}</strong> {t("chat.allows", { pct: validatedDiscountPct })}
            {clamped && ` ${t("chat.capped")}`}
          </span>
        </div>
      )}
    </div>
  );
}
