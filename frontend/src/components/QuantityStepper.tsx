import { useT } from "../i18n/I18n";
import { MinusIcon, PlusIcon } from "./icons";

interface Props { value: number; min?: number; max: number; onChange: (next: number) => void; label?: string }

/** +/- control that can never go outside [min, max]; max is the variant's available stock. */
export function QuantityStepper({ value, min = 1, max, onChange, label }: Props) {
  const { t } = useT();
  return (
    <div className="av-stepper" role="group" aria-label={label ?? t("pdp.quantity")}>
      <button type="button" aria-label={t("qty.less")} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <MinusIcon />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={t("qty.more")} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <PlusIcon />
      </button>
    </div>
  );
}
