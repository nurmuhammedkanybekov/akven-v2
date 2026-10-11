import { useT } from "../i18n/I18n";
import { useMoney } from "../shop/useMoney";

interface PriceProps {
  amount: number | null;
  /** "from 6.00" on catalog cards, where a product has several variants at different prices. */
  from?: boolean;
  /** Original price, shown struck through next to a reduced one. */
  was?: number;
  large?: boolean;
}

/** A price in the visitor's currency (dollars or som, see useMoney). */
export function Price({ amount, from, was, large }: PriceProps) {
  const { t } = useT();
  const { money } = useMoney();
  if (amount === null) return <span className="av-price av-muted">{t("price.unavailable")}</span>;
  return (
    <span className={`av-price${large ? " av-price--lg" : ""}`}>
      {from && <span className="av-price__from">{t("price.from")}</span>}
      {money(amount)}
      {was !== undefined && (
        <>
          <s className="av-price__was" aria-hidden="true">{money(was)}</s>
          <span className="av-visually-hidden"> ({t("price.was", { price: money(was) })})</span>
        </>
      )}
    </span>
  );
}
