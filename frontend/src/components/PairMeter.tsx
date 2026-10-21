/**
 * The pairs in the bag counted as little socks on a line, filling one by one towards the next price step (a sock
 * for every pair up to twenty, beyond that each sock stands for a few). The reached ones are knitted in gold and pop in
 * one after another; the rest are outlines. Decorative: the same numbers are written out next to it.
 */
export function PairMeter({ total, target }: { total: number; target: number }) {
  const slots = Math.min(target, 20);
  const per = target / slots;
  const filled = Math.min(slots, Math.floor(total / per + 1e-9));
  return (
    <div className="av-pairs" aria-hidden="true">
      {Array.from({ length: slots }, (_, i) => (
        <svg key={i} viewBox="0 0 12 20" className={i < filled ? "is-on" : undefined} style={{ "--i": i } as React.CSSProperties}>
          <path d="M2 1h6v10l3 3a3 3 0 0 1-2 5H4a3 3 0 0 1-3-3V1Z" />
        </svg>
      ))}
    </div>
  );
}
