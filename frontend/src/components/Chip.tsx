/** A filter choice with an optional live count, e.g. "Sport 4". Counts of 0 disable the chip. */
export function Chip({ label, count, pressed, onToggle }: { label: string; count?: number; pressed: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="av-chip" aria-pressed={pressed} onClick={onToggle} disabled={count === 0 && !pressed}>
      {label}
      {count !== undefined && <span className="av-chip__count">{count}</span>}
    </button>
  );
}
