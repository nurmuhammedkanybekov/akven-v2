import { MinusIcon, PlusIcon } from "./icons";

interface Props { value: number; min?: number; max: number; onChange: (next: number) => void; label?: string }

/** +/- control that can never go outside [min, max]; max is the variant's available stock. */
export function QuantityStepper({ value, min = 1, max, onChange, label = "Quantity" }: Props) {
  return (
    <div className="av-stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <MinusIcon />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <PlusIcon />
      </button>
    </div>
  );
}
