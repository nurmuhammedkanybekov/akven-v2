import { Link } from "react-router-dom";
import type { GiftInput } from "../api/types";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/en";
import { BOX_COLOURS, RIBBON_COLOURS } from "./GiftBoxScene";
import { GiftIcon } from "./icons";

/**
 * A gift box in words: the box and ribbon, who the card is for and from, and the card itself (as text, line breaks
 * kept). Used in the bag, at checkout, on the order and for the family packing it at the stall.
 */
export function GiftSummary({ gift, onRemove, edit }: { gift: GiftInput; onRemove?: () => void; edit?: boolean }) {
  const { t } = useT();
  return (
    <section className="av-giftsum" aria-label={t("gb.eyebrow")}
             style={{ "--face": BOX_COLOURS[gift.box].face, "--rib": RIBBON_COLOURS[gift.ribbon] } as React.CSSProperties}>
      <span className="av-giftsum__box" aria-hidden="true"><GiftIcon /></span>
      <div className="av-giftsum__body">
        <strong>{t("gb.summary", { box: t(`gb.box.${gift.box}` as MessageKey), ribbon: t(`gb.ribbon.${gift.ribbon}` as MessageKey) })}</strong>
        {(gift.to || gift.from) && (
          <span className="av-small">{[gift.to && t("gb.forName", { name: gift.to }), gift.from && t("gb.fromName", { name: gift.from })].filter(Boolean).join(" · ")}</span>
        )}
        {gift.message && <blockquote className="av-giftsum__msg">{gift.message}</blockquote>}
        {gift.hidePrices && <span className="av-small av-muted">{t("gb.noPrices")}</span>}
        {(edit || onRemove) && (
          <span className="av-row av-giftsum__acts">
            {edit && <Link to="/gift" className="av-small">{t("gb.edit")}</Link>}
            {onRemove && <button type="button" className="av-linkbtn av-small" onClick={onRemove}>{t("gb.remove")}</button>}
          </span>
        )}
      </div>
    </section>
  );
}

/** In the bag, for an order that is not a gift yet. */
export function GiftPromo() {
  const { t } = useT();
  return (
    <Link to="/gift" className="av-giftpromo">
      <span className="av-giftpromo__icon" aria-hidden="true"><GiftIcon /></span>
      <span><strong>{t("gb.promo")}</strong><br /><span className="av-small">{t("gb.promoS")}</span></span>
    </Link>
  );
}
