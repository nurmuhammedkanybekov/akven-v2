import { formatPrice } from "../lib/format";

interface PriceProps {
  amount: number | null;
  /** "from 6.00" on catalog cards, where a product has several variants at different prices. */
  from?: boolean;
  /** Original price, shown struck through next to a reduced one. */
  was?: number;
  large?: boolean;
}

export function Price({ amount, from, was, large }: PriceProps) {
  if (amount === null) return <span className="av-price av-muted">Unavailable</span>;
  return (
    <span className={`av-price${large ? " av-price--lg" : ""}`}>
      {from && <span className="av-price__from">From</span>}
      {formatPrice(amount)}
      {was !== undefined && (
        <>
          <s className="av-price__was" aria-hidden="true">{formatPrice(was)}</s>
          <span className="av-visually-hidden"> (was {formatPrice(was)})</span>
        </>
      )}
    </span>
  );
}
