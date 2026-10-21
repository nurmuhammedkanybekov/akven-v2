/** A filter choice with an optional live count, e.g. "Sport 4". Counts of 0 disable the chip. */
export function Chip({ label, count, pressed, onToggle, icon }: { label: string; count?: number; pressed: boolean; onToggle: () => void; icon?: React.ReactNode }) {
  return (
    <button type="button" className="av-chip" aria-pressed={pressed} onClick={onToggle} disabled={count === 0 && !pressed}>
      {icon}{label}
      {count !== undefined && <span className="av-chip__count">{count}</span>}
    </button>
  );
}
